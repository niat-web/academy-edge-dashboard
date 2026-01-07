import { NextResponse } from 'next/server'
import { startBackgroundWorker } from '@/lib/background-worker'

let workerStarted = false

/**
 * Initialize background worker
 * Call this endpoint once when the app starts
 */
export async function GET() {
  if (workerStarted) {
    return NextResponse.json({
      status: 'ok',
      message: 'Background worker already started',
    })
  }

  try {
    startBackgroundWorker()
    workerStarted = true
    return NextResponse.json({
      status: 'ok',
      message: 'Background worker started successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Failed to start background worker',
      },
      { status: 500 }
    )
  }
}

