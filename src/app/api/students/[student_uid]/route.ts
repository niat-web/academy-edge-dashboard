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
        $lookup: {
          from: 'students-resumes',
          localField: 'student_uid',
          foreignField: 'student_uid',
          as: 'resume_data'
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
          assessment: { $arrayElemAt: ['$assessment_data', 0] },
          resume: { $arrayElemAt: ['$resume_data', 0] }
        }
      }
    ]

    const results = await db.collection('students-tr2').aggregate(pipeline).toArray()

    if (!results || results.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Student not found' },
        { status: 404 }
      )
    }

    const studentData = results[0]

    // Calculate progress
    const progress = {
      information: true, // Always true if student exists
      assessment: !!studentData.assessment?.progress?.assessment_completed,
      tr1: !!studentData.tr1?.progress?.tr1_completed,
      tr2: !!studentData.progress?.tr2_completed,
      completed: false,
    }

    // Completed if all 3 assessments are done
    progress.completed = progress.assessment && progress.tr1 && progress.tr2

    const completedCount = Object.values(progress).filter(Boolean).length
    const progressPercentage = (completedCount / 5) * 100

    return NextResponse.json({
      status: 'ok',
      data: {
        student_uid,
        basic_info: studentData.basic_info || {},
        tr2: studentData.tr2 || {},
        tr1: studentData.tr1?.tr1 || {},
        assessment: studentData.assessment?.assessment || {},
        candidate_resume: studentData.resume?.candidate_resume || null,
        progress: {
          ...progress,
          percentage: progressPercentage,
          completedCount,
        },
        timestamps: {
          created_at: studentData.timestamps?.created_at,
          updated_at: studentData.timestamps?.updated_at,
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
