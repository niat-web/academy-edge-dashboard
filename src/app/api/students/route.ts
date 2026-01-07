import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    const client = await clientPromise
    const db = client.db('student_dashboard')

    // Build query for search
    const query: any = {}
    if (search) {
      query.$or = [
        { 'basic_info.name': { $regex: search, $options: 'i' } },
        { 'basic_info.university': { $regex: search, $options: 'i' } },
        { student_uid: { $regex: search, $options: 'i' } },
      ]
    }

    // Get total count
    const total = await db.collection('students-tr2').countDocuments(query)

    // Fetch students with pagination
    const students = await db
      .collection('students-tr2')
      .find(query)
      .sort({ 'timestamps.updated_at': -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      status: 'ok',
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}

