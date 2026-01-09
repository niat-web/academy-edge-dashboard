import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

<<<<<<< HEAD
// Simple in-memory cache for static data with TTL
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(key: string) {
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

=======
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const collegeName = searchParams.get('college') || ''
    const evaluationType = searchParams.get('evaluation') || ''
    const interviewType = searchParams.get('interview') || '' // 'tr1' or 'tr2'
<<<<<<< HEAD
    const verdictType = searchParams.get('verdict') || '' // 'Strong Hire', 'Hire', 'Weak Hire'
=======
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
    const skip = (page - 1) * limit

    const client = await clientPromise
    const db = client.db('student_dashboard')

<<<<<<< HEAD
    // Build match stage for MongoDB aggregation
    const matchStage: any = {}

    // Search by name or UID using text search or regex
    if (search) {
      matchStage.$or = [
=======
    // Build query for searching data
    const query: any = {}
    
    // Search by name or UID
    if (search) {
      query.$or = [
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
        { 'basic_info.name': { $regex: search, $options: 'i' } },
        { student_uid: { $regex: search, $options: 'i' } },
      ]
    }

    // Filter by college name
    if (collegeName) {
<<<<<<< HEAD
      const collegeCondition = {
        $or: [
=======
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
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
          { 'basic_info.university': { $regex: collegeName, $options: 'i' } },
          { 'basic_info.college_name': { $regex: collegeName, $options: 'i' } },
        ]
      }
<<<<<<< HEAD

      if (matchStage.$or) {
        // Combine with existing $or conditions using $and
        matchStage.$and = [
          { $or: matchStage.$or },
          collegeCondition
        ]
        delete matchStage.$or
      } else {
        matchStage.$or = collegeCondition.$or
      }
    }

    // Build aggregation pipeline to join all related data in one query
    const pipeline: any[] = [
      { $match: matchStage },
    ]

    // Add lookups to get related data for filtering
    pipeline.push(
      // Lookup assessment data
      {
        $lookup: {
          from: 'students',
          localField: 'student_uid',
          foreignField: 'student_uid',
          as: 'assessment_data',
          pipeline: [
            {
              $project: {
                'assessment.scores.student_assessment_score': 1,
                'assessment.scores.coding_student_score': 1,
                'assessment.scores.dsa_student_score': 1,
                'assessment.scores.cs_fundamentals_student_score': 1,
                'assessment.scores.quantitative_student_score': 1,
                'assessment.scores.logical_student_score': 1,
                'assessment.scores.verbal_student_score': 1,
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: '$assessment_data',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup TR1 data
      {
        $lookup: {
          from: 'students-tr1',
          localField: 'student_uid',
          foreignField: 'student_uid',
          as: 'tr1_data',
          pipeline: [
            {
              $project: {
                'tr1.total_score': 1,
              }
            }
          ]
        }
      },
      // Lookup TR2 data (for interview filter)
      {
        $lookup: {
          from: 'students-tr2',
          localField: 'student_uid',
          foreignField: 'student_uid',
          as: 'tr2_data_filter',
          pipeline: [
            {
              $project: {
                'tr2.overall_score': 1,
              }
            }
          ]
        }
      },
      // Lookup verdict data
      {
        $lookup: {
          from: 'final_verdicts',
          localField: 'student_uid',
          foreignField: 'student_uid',
          as: 'verdict_data',
          pipeline: [
            {
              $project: {
                recommendation: 1,
              }
            }
          ]
        }
      }
    )

    // Add evaluation filter to pipeline if specified
=======
    }

    // Get all students first to filter by evaluation/interview scores
    let allStudents = await db
      .collection('students-tr2')
      .find(query)
      .sort({ 'timestamps.updated_at': -1 })
      .toArray()

    // Filter by evaluation type (assessment scores)
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
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
<<<<<<< HEAD
        pipeline.push({
          $match: {
            'assessment_data': { $exists: true },
            [`assessment_data.${fieldPath}`]: { $exists: true, $nin: [null, ''] }
          }
        })
      }
    }

    // Add interview filter to pipeline if specified
    if (interviewType) {
      if (interviewType === 'tr1') {
        pipeline.push({
          $match: {
            'tr1_data.0': { $exists: true }
          }
        })
      } else if (interviewType === 'tr2') {
        pipeline.push({
          $match: {
            'tr2_data_filter.0': { $exists: true }
          }
        })
      }
    }

    // Add verdict filter to pipeline if specified
    if (verdictType) {
      pipeline.push({
        $match: {
          'verdict_data.0.recommendation': verdictType
        }
      })
    }

    // Add sort after all filters
    pipeline.push({ $sort: { 'timestamps.updated_at': -1 } })

    // Optimization: Use $facet to get both total count and paginated results in one query
    const facetPipeline = [
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            // Project only required fields
            {
              $project: {
                student_uid: 1,
                'basic_info.name': 1,
                'basic_info.university': 1,
                'basic_info.college_name': 1,
                assessment_data: 1, // Already unwound
                tr1_data: 1,
                tr2_data_filter: 1,
                verdict_data: 1,
              }
            },
          ]
        }
      }
    ]

    const results = await db.collection('students-tr2').aggregate(facetPipeline).toArray()

    const total = results[0]?.metadata[0]?.total || 0
    const paginatedStudents = results[0]?.data || []

    // Enrich students with flattened data structure
    const enrichedStudents = paginatedStudents.map((student: any, index: number) => {
      const assessment = student.assessment_data // Already unwound

      // DEBUG LOG REMOVED

      // DEBUG LOG REMOVED

      const tr1 = student.tr1_data?.[0]
      const tr2 = student.tr2_data_filter?.[0]
      const verdict = student.verdict_data?.[0]

      return {
        student_uid: student.student_uid,
        basic_info: student.basic_info,
=======
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
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
        assessment_score: assessment?.assessment?.scores?.student_assessment_score || null,
        tr1_score: tr1?.tr1?.total_score || null,
        tr2_score: tr2?.tr2?.overall_score || null,
        final_verdict: verdict?.recommendation || null,
<<<<<<< HEAD
=======
        // For evaluation filter display
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
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

<<<<<<< HEAD
    // Get college names for dropdown (use cache)
    let allColleges = getCached('colleges')
    if (!allColleges) {
      const collegeResults = await db.collection('students-tr2')
        .aggregate([
          {
            $match: {
              $or: [
                { 'basic_info.university': { $exists: true, $nin: [null, ''] } },
                { 'basic_info.college_name': { $exists: true, $nin: [null, ''] } }
              ]
            }
          },
          {
            $project: {
              colleges: {
                $concatArrays: [
                  { $cond: [{ $and: ['$basic_info.university', { $ne: ['$basic_info.university', ''] }] }, ['$basic_info.university'], []] },
                  { $cond: [{ $and: ['$basic_info.college_name', { $ne: ['$basic_info.college_name', ''] }] }, ['$basic_info.college_name'], []] }
                ]
              }
            }
          },
          { $unwind: '$colleges' },
          { $group: { _id: '$colleges' } },
          { $sort: { _id: 1 } }
        ])
        .toArray()

      allColleges = collegeResults.map((r: any) => r._id).filter(Boolean)
      setCache('colleges', allColleges)
    }

    // Get available evaluation types (use cache)
    let evaluationTypes = getCached('evaluationTypes')
    if (!evaluationTypes) {
      evaluationTypes = ['coding', 'dsa', 'cs fundamentals', 'quantitative', 'logical', 'verbal']

      // Verify which evaluation types have data
      const evaluationFieldMap: Record<string, string> = {
        'coding': 'assessment.scores.coding_student_score',
        'dsa': 'assessment.scores.dsa_student_score',
        'cs fundamentals': 'assessment.scores.cs_fundamentals_student_score',
        'quantitative': 'assessment.scores.quantitative_student_score',
        'logical': 'assessment.scores.logical_student_score',
        'verbal': 'assessment.scores.verbal_student_score',
      }

      const validEvaluationTypes: string[] = []
      for (const [evalType, fieldPath] of Object.entries(evaluationFieldMap)) {
        const count = await db.collection('students').countDocuments({
          [fieldPath]: { $exists: true, $nin: [null, ''] },
        })
        if (count > 0) {
          validEvaluationTypes.push(evalType)
        }
      }

      evaluationTypes = validEvaluationTypes
      setCache('evaluationTypes', evaluationTypes)
    }

    // Get available interview types (use cache)
    let interviewTypes = getCached('interviewTypes')
    if (!interviewTypes) {
      const [tr1Count, tr2Count] = await Promise.all([
        db.collection('students-tr1').countDocuments({}),
        db.collection('students-tr2').countDocuments({})
      ])

      interviewTypes = []
      if (tr1Count > 0) interviewTypes.push('tr1')
      if (tr2Count > 0) interviewTypes.push('tr2')

      setCache('interviewTypes', interviewTypes)
    }

    // Get available verdict types (use cache)
    let verdictTypes = getCached('verdictTypes')
    if (!verdictTypes) {
      const verdicts = await db.collection('final_verdicts')
        .distinct('recommendation', { recommendation: { $exists: true, $nin: [null, ''] } })

      verdictTypes = verdicts.filter(Boolean).sort()
      setCache('verdictTypes', verdictTypes)
    }

=======
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
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c

    return NextResponse.json({
      status: 'ok',
      data: enrichedStudents,
      pagination: {
        page,
        limit,
<<<<<<< HEAD
        total: total,
=======
        total,
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
        totalPages: Math.ceil(total / limit),
      },
      colleges: allColleges,
      availableEvaluations: evaluationTypes,
      availableInterviews: interviewTypes,
<<<<<<< HEAD
      availableVerdicts: verdictTypes,
=======
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
    })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
<<<<<<< HEAD
=======

>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
