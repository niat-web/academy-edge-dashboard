/**
 * Initialize background worker on server startup
 * This file is imported in the app to start the worker
 * Works in both development (npm run dev) and production (npm start)
 */

let workerInitialized = false

export function initWorker() {
  if (workerInitialized) {
    return
  }

  // Only run on server side (not in browser)
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    try {
      // Use dynamic import for better compatibility
      import('./background-worker').then((module) => {
        module.startBackgroundWorker()
        workerInitialized = true
        console.log('[INIT] Background worker initialized successfully')
        console.log('[INIT] Sync will run every 5 minutes')
      }).catch((error: any) => {
        console.error('[INIT] Failed to initialize background worker:', error.message)
      })
    } catch (error: any) {
      console.error('[INIT] Failed to initialize background worker:', error.message)
    }
  }
}

// Auto-initialize when this module is imported (server-side only)
// Only run during runtime, not during build
// Skip on Vercel (use Vercel Cron Jobs instead)
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Check if we're on Vercel
  const isVercel = !!process.env.VERCEL
  
  // Check if we're in build mode
  // During build, Next.js doesn't have a running server, so we skip worker initialization
  const isBuildTime = 
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-development-build' ||
    process.argv.includes('build') ||
    process.env.npm_lifecycle_event === 'build'
  
  // Don't run background worker on Vercel (use Vercel Cron Jobs instead)
  // Don't run during build
  if (!isVercel && !isBuildTime) {
    // Use setTimeout to ensure Next.js is fully initialized
    if (process.env.NODE_ENV === 'production') {
      // In production (npm start), initialize immediately
      initWorker()
    } else {
      // In development (npm run dev), wait a bit for Next.js to be ready
      setTimeout(() => {
        initWorker()
      }, 2000)
    }
  } else if (isVercel) {
    console.log('[INIT] Skipping background worker on Vercel - using Vercel Cron Jobs instead')
  } else {
    console.log('[INIT] Skipping background worker initialization during build')
  }
}

