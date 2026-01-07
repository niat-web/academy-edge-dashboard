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

    // Fetch student from all collections
    const [tr2Student, tr1Student, assessmentStudent] = await Promise.all([
      db.collection('students-tr2').findOne({ student_uid }),
      db.collection('students-tr1').findOne({ student_uid }),
      db.collection('students').findOne({ student_uid }),
    ])

    if (!tr2Student) {
      return NextResponse.json(
        { status: 'error', message: 'Student not found' },
        { status: 404 }
      )
    }

    // Calculate progress
    const progress = {
      information: true, // Always true if student exists
      assessment: !!assessmentStudent?.progress?.assessment_completed,
      tr1: !!tr1Student?.progress?.tr1_completed,
      tr2: !!tr2Student?.progress?.tr2_completed,
      completed: false, // Will be calculated below
    }

    // Completed if all 3 assessments are done
    progress.completed = progress.assessment && progress.tr1 && progress.tr2

    const completedCount = Object.values(progress).filter(Boolean).length
    const progressPercentage = (completedCount / 5) * 100

    return NextResponse.json({
      status: 'ok',
      data: {
        student_uid,
        basic_info: tr2Student.basic_info || {},
        tr2: tr2Student.tr2 || {},
        tr1: tr1Student?.tr1 || {},
        assessment: assessmentStudent?.assessment || {},
        progress: {
          ...progress,
          percentage: progressPercentage,
          completedCount,
        },
        timestamps: {
          created_at: tr2Student.timestamps?.created_at,
          updated_at: tr2Student.timestamps?.updated_at,
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

