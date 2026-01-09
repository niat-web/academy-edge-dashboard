import { NextResponse } from 'next/server'
// This route is for manual worker initialization (not used on Vercel)
// On Vercel, use Vercel Cron Jobs instead

let workerStarted = false

/**
 * Initialize background worker
 * Call this endpoint once when the app starts
 * NOTE: This does NOTHING on Vercel - use Vercel Cron Jobs instead
 */
export async function GET() {
  // Don't start worker on Vercel
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({
      status: 'ok',
      message: 'Background worker not needed on Vercel - using Vercel Cron Jobs instead',
    })
  }

  if (workerStarted) {
    return NextResponse.json({
      status: 'ok',
      message: 'Background worker already started',
    })
  }

  try {
    // Dynamic import to avoid loading on Vercel
    const { startBackgroundWorker } = await import('@/lib/background-worker')
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

