import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const collegeName = searchParams.get('college') || ''
    const evaluationType = searchParams.get('evaluation') || ''
    const interviewType = searchParams.get('interview') || '' // 'tr1' or 'tr2'
    const skip = (page - 1) * limit

    const client = await clientPromise
    const db = client.db('student_dashboard')

    // Build query for searching data
    const query: any = {}
    
    // Search by name or UID
    if (search) {
      query.$or = [
        { 'basic_info.name': { $regex: search, $options: 'i' } },
        { student_uid: { $regex: search, $options: 'i' } },
      ]
    }

    // Filter by college name
    if (collegeName) {
      query.$or = [
        ...(query.$or || []),
        { 'basic_info.university': { $regex: collegeName, $options: 'i' } },
        { 'basic_info.college_name': { $regex: collegeName, $options: 'i' } },
      ]
      // If we have $or from search, combine them properly
      if (search && query.$or.length > 2) {
        // We need to restructure: search OR college
        query.$or = [
          { 'basic_info.name': { $regex: search, $options: 'i' } },
          { student_uid: { $regex: search, $options: 'i' } },
          { 'basic_info.university': { $regex: collegeName, $options: 'i' } },
          { 'basic_info.college_name': { $regex: collegeName, $options: 'i' } },
        ]
      }
    }

    // Get all students first to filter by evaluation/interview scores
    let allStudents = await db
      .collection('students-tr2')
      .find(query)
      .sort({ 'timestamps.updated_at': -1 })
      .toArray()

    // Filter by evaluation type (assessment scores)
    if (evaluationType) {
      const evaluationFieldMap: Record<string, string> = {
        'coding': 'assessment.scores.coding_student_score',
        'dsa': 'assessment.scores.dsa_student_score',
        'cs fundamentals': 'assessment.scores.cs_fundamentals_student_score',
        'quantitative': 'assessment.scores.quantitative_student_score',
        'logical': 'assessment.scores.logical_student_score',
        'verbal': 'assessment.scores.verbal_student_score',
      }

      const fieldPath = evaluationFieldMap[evaluationType.toLowerCase()]
      if (fieldPath) {
        // Get students with assessment data
        const studentUids = allStudents.map((s: any) => s.student_uid)
        const assessmentStudents = await db
          .collection('students')
          .find({
            student_uid: { $in: studentUids },
            [fieldPath]: { $exists: true, $nin: [null, ''] },
          })
          .project({ student_uid: 1, [fieldPath]: 1 })
          .toArray()

        const validUids = new Set(assessmentStudents.map((s: any) => s.student_uid))
        allStudents = allStudents.filter((s: any) => validUids.has(s.student_uid))
      }
    }

    // Filter by interview type (TR1 or TR2)
    if (interviewType) {
      const collectionName = interviewType === 'tr1' ? 'students-tr1' : 'students-tr2'
      const studentUids = allStudents.map((s: any) => s.student_uid)
      const interviewStudents = await db
        .collection(collectionName)
        .find({
          student_uid: { $in: studentUids },
        })
        .project({ student_uid: 1 })
        .toArray()

      const validUids = new Set(interviewStudents.map((s: any) => s.student_uid))
      allStudents = allStudents.filter((s: any) => validUids.has(s.student_uid))
    }

    // Get total count after filtering
    const total = allStudents.length

    // Apply pagination
    const paginatedStudents = allStudents.slice(skip, skip + limit)

    // Fetch additional data for each student (assessment, TR1, TR2, verdict)
    const studentUids = paginatedStudents.map((s: any) => s.student_uid)
    
    const [assessmentData, tr1Data, tr2Data, verdictData] = await Promise.all([
      db.collection('students')
        .find({ student_uid: { $in: studentUids } })
        .toArray(),
      db.collection('students-tr1')
        .find({ student_uid: { $in: studentUids } })
        .toArray(),
      db.collection('students-tr2')
        .find({ student_uid: { $in: studentUids } })
        .toArray(),
      db.collection('final_verdicts')
        .find({ student_uid: { $in: studentUids } })
        .toArray(),
    ])

    // Create lookup maps
    const assessmentMap = new Map(assessmentData.map((s: any) => [s.student_uid, s]))
    const tr1Map = new Map(tr1Data.map((s: any) => [s.student_uid, s]))
    const tr2Map = new Map(tr2Data.map((s: any) => [s.student_uid, s]))
    const verdictMap = new Map(verdictData.map((s: any) => [s.student_uid, s]))

    // Enrich students with additional data
    const enrichedStudents = paginatedStudents.map((student: any) => {
      const assessment = assessmentMap.get(student.student_uid)
      const tr1 = tr1Map.get(student.student_uid)
      const tr2 = tr2Map.get(student.student_uid)
      const verdict = verdictMap.get(student.student_uid)

      return {
        ...student,
        assessment_score: assessment?.assessment?.scores?.student_assessment_score || null,
        tr1_score: tr1?.tr1?.total_score || null,
        tr2_score: tr2?.tr2?.overall_score || null,
        final_verdict: verdict?.recommendation || null,
        // For evaluation filter display
        evaluation_scores: {
          coding: assessment?.assessment?.scores?.coding_student_score || null,
          dsa: assessment?.assessment?.scores?.dsa_student_score || null,
          'cs fundamentals': assessment?.assessment?.scores?.cs_fundamentals_student_score || null,
          quantitative: assessment?.assessment?.scores?.quantitative_student_score || null,
          logical: assessment?.assessment?.scores?.logical_student_score || null,
          verbal: assessment?.assessment?.scores?.verbal_student_score || null,
        },
      }
    })

    // Get college names for dropdown (only from TR2, only those with actual student data)
    // First, get all valid student UIDs that have complete data
    const validStudentUids = await db
      .collection('students-tr2')
      .find({ 
        student_uid: { $exists: true, $nin: [null, ''] },
        'basic_info.name': { $exists: true, $nin: [null, ''] }
      })
      .project({ student_uid: 1 })
      .toArray()
      .then((students) => students.map((s: any) => s.student_uid).filter(Boolean))

    // Then get distinct colleges only for students with valid data
    const allTr2Students = await db
      .collection('students-tr2')
      .find({ 
        student_uid: { $in: validStudentUids },
        $or: [
          { 'basic_info.university': { $exists: true, $nin: [null, ''] } },
          { 'basic_info.college_name': { $exists: true, $nin: [null, ''] } }
        ]
      })
      .project({ 'basic_info.university': 1, 'basic_info.college_name': 1, student_uid: 1 })
      .toArray()
    
    const collegeSet = new Set<string>()
    allTr2Students.forEach((s: any) => {
      if (s.basic_info?.university && s.basic_info.university.trim()) {
        collegeSet.add(s.basic_info.university.trim())
      }
      if (s.basic_info?.college_name && s.basic_info.college_name.trim()) {
        collegeSet.add(s.basic_info.college_name.trim())
      }
    })
    
    const allColleges = Array.from(collegeSet).filter(Boolean).sort()

    // Get available evaluation types (only those with data)
    const evaluationTypes: string[] = []
    const evaluationFieldMap: Record<string, string> = {
      'coding': 'assessment.scores.coding_student_score',
      'dsa': 'assessment.scores.dsa_student_score',
      'cs fundamentals': 'assessment.scores.cs_fundamentals_student_score',
      'quantitative': 'assessment.scores.quantitative_student_score',
      'logical': 'assessment.scores.logical_student_score',
      'verbal': 'assessment.scores.verbal_student_score',
    }

    for (const [evalType, fieldPath] of Object.entries(evaluationFieldMap)) {
      const count = await db.collection('students').countDocuments({
        [fieldPath]: { $exists: true, $nin: [null, ''] },
      })
      if (count > 0) {
        evaluationTypes.push(evalType)
      }
    }

    // Get available interview types (only those with data)
    const interviewTypes: string[] = []
    const tr1Count = await db.collection('students-tr1').countDocuments({})
    const tr2Count = await db.collection('students-tr2').countDocuments({})
    
    if (tr1Count > 0) {
      interviewTypes.push('tr1')
    }
    if (tr2Count > 0) {
      interviewTypes.push('tr2')
    }

    return NextResponse.json({
      status: 'ok',
      data: enrichedStudents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      colleges: allColleges,
      availableEvaluations: evaluationTypes,
      availableInterviews: interviewTypes,
    })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}

