import clientPromise from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('student_dashboard')

    // Optional: check DB connection
    await db.command({ ping: 1 })

    // Optional: fetch a test student (for sanity check)
    const student = await db
      .collection('students')
      .findOne({ student_id: 'S001' })

    return NextResponse.json({
      status: 'ok',
      dbConnected: true,
      testStudentFound: !!student,
      testStudent: student || null
    })
  } catch (error) {
    console.error('DB health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        dbConnected: false,
        message: 'MongoDB health check failed'
      },
      { status: 500 }
    )
  }
}

