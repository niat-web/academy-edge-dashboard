import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      )
    }

    // Get admin token from environment variable
    const adminToken = process.env.ADMIN_TOKEN

    if (!adminToken) {
      console.error('ADMIN_TOKEN environment variable is not set')
      return NextResponse.json(
        { success: false, message: 'Admin authentication not configured' },
        { status: 500 }
      )
    }

    // Verify token
    if (token === adminToken) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid admin token' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Error verifying admin token:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}

