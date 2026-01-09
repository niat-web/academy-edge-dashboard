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
  // Vercel Cron Jobs send a special header - verify it
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // For Vercel Cron, check the cron secret if set
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow Vercel's internal cron calls (they don't send auth header)
    // But require auth for external calls
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') ||
                         request.headers.get('x-vercel-cron') === '1'
    
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const startTime = Date.now()
    console.log('[CRON] Starting scheduled sync...')

    // Call sync functions directly instead of HTTP requests (more efficient and reliable)
    let syncData: any
    try {
      console.log('[CRON] Importing sync/all module...')
      const syncAllModule = await import('../../sync/all/route')
      console.log('[CRON] Calling POST function...')
      const syncResponse = await syncAllModule.POST()
      console.log('[CRON] Response received, type:', typeof syncResponse)
      
      // Handle NextResponse properly
      if (syncResponse && typeof syncResponse.json === 'function') {
        console.log('[CRON] Parsing JSON response...')
        syncData = await syncResponse.json()
      } else {
        console.error('[CRON] Invalid response format:', syncResponse)
        syncData = { status: 'error', message: 'Invalid response from sync function' }
      }
      
      console.log('[CRON] Data sync result:', syncData?.status)
    } catch (error: any) {
      console.error('[CRON] Error syncing data:', error)
      console.error('[CRON] Error name:', error?.name)
      console.error('[CRON] Error message:', error?.message)
      console.error('[CRON] Error stack:', error?.stack)
      syncData = { status: 'error', message: error?.message || 'Sync failed' }
    }

    // Generate verdicts (only if data sync was successful)
    let verdictData = null
    if (syncData.status === 'ok') {
      // Wait 5 seconds before generating verdicts to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 5000))
      
      try {
        console.log('[CRON] Importing verdicts module...')
        const verdictModule = await import('../../sync/verdicts/route')
        console.log('[CRON] Calling verdict POST function...')
        const verdictResponse = await verdictModule.POST()
        console.log('[CRON] Verdict response received, type:', typeof verdictResponse)
        
        // Handle NextResponse properly
        if (verdictResponse && typeof verdictResponse.json === 'function') {
          console.log('[CRON] Parsing verdict JSON response...')
          verdictData = await verdictResponse.json()
        } else {
          console.error('[CRON] Invalid verdict response format:', verdictResponse)
          verdictData = { status: 'error', message: 'Invalid response from verdict function' }
        }
        
        console.log('[CRON] Verdict generation result:', verdictData?.status)
      } catch (error: any) {
        console.error('[CRON] Error generating verdicts:', error)
        console.error('[CRON] Verdict error name:', error?.name)
        console.error('[CRON] Verdict error message:', error?.message)
        console.error('[CRON] Verdict error stack:', error?.stack)
        verdictData = { status: 'error', message: error?.message || 'Verdict generation failed' }
      }
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
    console.error('[CRON] Top-level error:', error)
    console.error('[CRON] Error name:', error?.name)
    console.error('[CRON] Error message:', error?.message)
    console.error('[CRON] Error stack:', error?.stack)
    console.error('[CRON] Error cause:', error?.cause)
    
    // Provide more detailed error message
    let errorMessage = error?.message || 'Cron job failed'
    if (error?.message?.includes('fetch')) {
      errorMessage = `Network error: ${error.message}. This might be due to Google Sheets API connection issues or missing environment variables.`
    }
    
    return NextResponse.json(
      {
        status: 'error',
        message: errorMessage,
        errorDetails: process.env.NODE_ENV === 'development' ? {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        } : undefined,
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

