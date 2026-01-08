/**
 * Background worker that runs sync jobs every 5 minutes
 * This runs in the Node.js process when the app is running
 * Works in both development (npm run dev) and production (npm start)
 */

let syncInterval: NodeJS.Timeout | null = null
let isRunning = false

async function runSync() {
  // CRITICAL: Don't run on Vercel - use Vercel Cron Jobs instead
  // Check this FIRST before doing anything else
  // Vercel sets both VERCEL and VERCEL_ENV environment variables
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    console.log('[WORKER] Skipping background worker on Vercel - using Vercel Cron Jobs instead')
    return
  }

  if (isRunning) {
    console.log('[WORKER] Sync already running, skipping...')
    return
  }

  isRunning = true
  const startTime = Date.now()

  try {
    console.log('[WORKER] Starting background sync...')

    // Use HTTP requests to the API endpoints
    // This works reliably in both dev and production
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3000')

    // 1. Sync all data
    try {
      const syncResponse = await fetch(`${baseUrl}/api/sync/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(300000), // 5 minute timeout
      })
      
      if (!syncResponse.ok) {
        throw new Error(`Sync failed with status ${syncResponse.status}`)
      }
      
      const syncData = await syncResponse.json()
      console.log('[WORKER] Data sync result:', syncData.status)
      
      if (syncData.status === 'ok') {
        // Wait before generating verdicts to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 5000))
        
        // 2. Generate verdicts
        try {
          const verdictResponse = await fetch(`${baseUrl}/api/sync/verdicts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(600000), // 10 minute timeout for verdicts
          })
          
          if (!verdictResponse.ok) {
            throw new Error(`Verdict generation failed with status ${verdictResponse.status}`)
          }
          
          const verdictData = await verdictResponse.json()
          console.log('[WORKER] Verdict generation result:', verdictData.status)
          if (verdictData.succeeded !== undefined) {
            console.log(`[WORKER] Generated ${verdictData.succeeded}/${verdictData.total} verdicts`)
          }
        } catch (error: any) {
          console.error('[WORKER] Error generating verdicts:', error.message)
        }
      }
    } catch (error: any) {
      console.error('[WORKER] Error syncing data:', error.message)
      if (error.name === 'TimeoutError') {
        console.error('[WORKER] Sync timed out - this may indicate a problem with the sync process')
      }
    }

    const duration = Date.now() - startTime
    console.log(`[WORKER] Background sync completed in ${duration}ms`)
  } catch (error: any) {
    console.error('[WORKER] Critical error:', error)
    console.error('[WORKER] Error stack:', error.stack)
  } finally {
    isRunning = false
  }
}

/**
 * Start the background worker
 */
export function startBackgroundWorker() {
  // CRITICAL: Don't start on Vercel - use Vercel Cron Jobs instead
  // Check this FIRST before doing anything else
  // Vercel sets both VERCEL and VERCEL_ENV environment variables
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    console.log('[WORKER] Skipping background worker on Vercel - using Vercel Cron Jobs instead')
    return
  }

  if (syncInterval) {
    console.log('[WORKER] Background worker already running')
    return
  }

  console.log('[WORKER] Starting background worker (sync every 5 minutes)')

  // Run immediately on start
  runSync()

  // Then run every 5 minutes (300000 ms)
  syncInterval = setInterval(() => {
    runSync()
  }, 5 * 60 * 1000)

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    stopBackgroundWorker()
  })
  process.on('SIGINT', () => {
    stopBackgroundWorker()
  })
}

/**
 * Stop the background worker
 */
export function stopBackgroundWorker() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('[WORKER] Background worker stopped')
  }
}

