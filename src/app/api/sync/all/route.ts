import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

/**
 * Sync all data from Google Sheets to MongoDB
 * This endpoint can be called by a cron job every 5 minutes
 */
export async function POST() {
  try {
    const startTime = Date.now()
    console.log('[SYNC] Starting full data sync...')

    const results = {
      collegeTracker: { success: false, error: null as string | null, count: 0 },
      assessment: { success: false, error: null as string | null, count: 0 },
      tr1: { success: false, error: null as string | null, count: 0 },
      tr2: { success: false, error: null as string | null, count: 0 },
    }

    // Import sync functions dynamically to avoid circular dependencies
    const assessmentModule = await import('../assessment/route')
    const tr1Module = await import('../tr1/route')
    const tr2Module = await import('../tr2/route')
    const collegeTrackerModule = await import('../college-tracker/route')

    // 1. Sync College Tracker (Get latest sheet IDs)
    try {
      console.log('[SYNC] Syncing college tracker...')
      const response = await collegeTrackerModule.POST()
      const data = await response.json()
      if (data.status === 'ok') {
        results.collegeTracker = { success: true, error: null, count: data.upsertedCount || 0 }
      } else {
        results.collegeTracker = { success: false, error: data.message || 'Unknown error', count: 0 }
      }
    } catch (error: any) {
      console.error('[SYNC] Error syncing college tracker:', error)
      results.collegeTracker = { success: false, error: error.message, count: 0 }
    }

    // 2. Sync TR2 Data (Master Student List)
    try {
      console.log('[SYNC] Syncing TR2 data...')
      const response = await tr2Module.POST()
      const data = await response.json()
      if (data.status === 'ok') {
        results.tr2 = { success: true, error: null, count: data.upsertedCount || 0 }
      } else {
        results.tr2 = { success: false, error: data.message || 'Unknown error', count: 0 }
      }
    } catch (error: any) {
      console.error('[SYNC] Error syncing TR2:', error)
      results.tr2 = { success: false, error: error.message, count: 0 }
    }

    // 3. Sync TR1 Data (Depends on TR2 UIDs)
    try {
      console.log('[SYNC] Syncing TR1 data...')
      const response = await tr1Module.POST()
      const data = await response.json()
      if (data.status === 'ok') {
        results.tr1 = { success: true, error: null, count: data.updatedCount || 0 }
      } else {
        results.tr1 = { success: false, error: data.message || 'Unknown error', count: 0 }
      }
    } catch (error: any) {
      console.error('[SYNC] Error syncing TR1:', error)
      results.tr1 = { success: false, error: error.message, count: 0 }
    }

    // 4. Sync Assessment Data (Depends on TR2 UIDs & College Sheets)
    try {
      console.log('[SYNC] Syncing assessment data...')
      const response = await assessmentModule.POST()
      const data = await response.json()
      if (data.status === 'ok') {
        results.assessment = { success: true, error: null, count: data.upsertedCount || 0 }
      } else {
        results.assessment = { success: false, error: data.message || 'Unknown error', count: 0 }
      }
    } catch (error: any) {
      console.error('[SYNC] Error syncing assessment:', error)
      results.assessment = { success: false, error: error.message, count: 0 }
    }

    const duration = Date.now() - startTime
    console.log(`[SYNC] Completed in ${duration}ms`)

    return NextResponse.json({
      status: 'ok',
      results,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[SYNC] Critical error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

