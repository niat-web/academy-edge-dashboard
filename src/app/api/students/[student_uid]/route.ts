import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(
  request: Request,
  context: { params: Promise<{ student_uid: string }> }
) {
  try {
    const { student_uid } = await context.params

    const client = await clientPromise
    const db = client.db('student_dashboard')

<<<<<<< HEAD
    // Use aggregation pipeline with $lookup to fetch all data in a single query
    const pipeline = [
      { $match: { student_uid } },
      {
        $lookup: {
          from: 'students-tr1',
          localField: 'student_uid',
          foreignField: 'student_uid',
          as: 'tr1_data'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'student_uid',
          foreignField: 'student_uid',
          as: 'assessment_data'
        }
      },
      {
        $project: {
          student_uid: 1,
          basic_info: 1,
          tr2: 1,
          'progress.tr2_completed': 1,
          'timestamps.created_at': 1,
          'timestamps.updated_at': 1,
          tr1: { $arrayElemAt: ['$tr1_data', 0] },
          assessment: { $arrayElemAt: ['$assessment_data', 0] }
        }
      }
    ]

    const results = await db.collection('students-tr2').aggregate(pipeline).toArray()

    if (!results || results.length === 0) {
=======
    // Fetch student from all collections
    const [tr2Student, tr1Student, assessmentStudent] = await Promise.all([
      db.collection('students-tr2').findOne({ student_uid }),
      db.collection('students-tr1').findOne({ student_uid }),
      db.collection('students').findOne({ student_uid }),
    ])

    if (!tr2Student) {
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
      return NextResponse.json(
        { status: 'error', message: 'Student not found' },
        { status: 404 }
      )
    }

<<<<<<< HEAD
    const studentData = results[0]

    // Calculate progress
    const progress = {
      information: true, // Always true if student exists
      assessment: !!studentData.assessment?.progress?.assessment_completed,
      tr1: !!studentData.tr1?.progress?.tr1_completed,
      tr2: !!studentData.progress?.tr2_completed,
      completed: false,
=======
    // Calculate progress
    const progress = {
      information: true, // Always true if student exists
      assessment: !!assessmentStudent?.progress?.assessment_completed,
      tr1: !!tr1Student?.progress?.tr1_completed,
      tr2: !!tr2Student?.progress?.tr2_completed,
      completed: false, // Will be calculated below
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
    }

    // Completed if all 3 assessments are done
    progress.completed = progress.assessment && progress.tr1 && progress.tr2

    const completedCount = Object.values(progress).filter(Boolean).length
    const progressPercentage = (completedCount / 5) * 100

    return NextResponse.json({
      status: 'ok',
      data: {
        student_uid,
<<<<<<< HEAD
        basic_info: studentData.basic_info || {},
        tr2: studentData.tr2 || {},
        tr1: studentData.tr1?.tr1 || {},
        assessment: studentData.assessment?.assessment || {},
=======
        basic_info: tr2Student.basic_info || {},
        tr2: tr2Student.tr2 || {},
        tr1: tr1Student?.tr1 || {},
        assessment: assessmentStudent?.assessment || {},
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
        progress: {
          ...progress,
          percentage: progressPercentage,
          completedCount,
        },
        timestamps: {
<<<<<<< HEAD
          created_at: studentData.timestamps?.created_at,
          updated_at: studentData.timestamps?.updated_at,
=======
          created_at: tr2Student.timestamps?.created_at,
          updated_at: tr2Student.timestamps?.updated_at,
>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
<<<<<<< HEAD
=======

>>>>>>> 5de8b8c77a2467b5ea9516e149e72675f937963c
