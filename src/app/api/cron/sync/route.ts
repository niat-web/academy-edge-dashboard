import { NextResponse } from 'next/server'

/**
 * Cron endpoint that syncs all data and generates verdicts
 * This should be called every 5 minutes by an external cron service
 * 
 * To set up:
 * 1. Use a cron service like EasyCron, cron-job.org, or your server's cron
 * 2. Set it to call: POST https://your-domain.com/api/cron/sync
 * 3. Schedule: every 5 minutes (cron expression: 0,5,10,15,20,25,30,35,40,45,50,55 * * * *)
 * 
 * Or use this endpoint with a secret key for security
 */
export async function GET(request: Request) {
  // Optional: Add authentication
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startTime = Date.now()
    console.log('[CRON] Starting scheduled sync...')

    // 1. Sync all data
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sync/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const syncData = await syncResponse.json()

    // 2. Generate verdicts (only if data sync was successful)
    let verdictData = null
    if (syncData.status === 'ok') {
      const verdictResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sync/verdicts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      verdictData = await verdictResponse.json()
    }

    const duration = Date.now() - startTime
    console.log(`[CRON] Completed in ${duration}ms`)

    return NextResponse.json({
      status: 'ok',
      sync: syncData,
      verdicts: verdictData,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[CRON] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Cron job failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Same as GET but for POST requests
  return GET(request)
}

