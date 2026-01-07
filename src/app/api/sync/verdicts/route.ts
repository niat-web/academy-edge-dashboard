import { NextResponse } from 'next/server'
import { generateVerdictsForAllStudents } from '@/lib/verdict-service'

/**
 * Generate verdicts for all students who don't have one
 * This endpoint can be called by a cron job
 */
export async function POST() {
  try {
    const startTime = Date.now()
    console.log('[VERDICT SYNC] Starting verdict generation...')

    const result = await generateVerdictsForAllStudents(10) // Process 10 at a time

    const duration = Date.now() - startTime
    console.log(`[VERDICT SYNC] Completed in ${duration}ms`)

    return NextResponse.json({
      status: 'ok',
      ...result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[VERDICT SYNC] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Verdict generation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

