import { NextResponse } from 'next/server'
import { generateVerdictForStudent } from '@/lib/verdict-service'

/**
 * Manually trigger verdict generation for a specific student
 * This endpoint can be called to generate a verdict on-demand
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ student_uid: string }> }
) {
  try {
    const { student_uid } = await context.params
    console.log(`[MANUAL VERDICT] Generating verdict for ${student_uid}...`)

    const result = await generateVerdictForStudent(student_uid)

    if (result.success) {
      return NextResponse.json({
        status: 'ok',
        message: 'Verdict generated successfully',
        data: result.verdict,
      })
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: result.error || 'Failed to generate verdict',
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[MANUAL VERDICT] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Failed to generate verdict',
      },
      { status: 500 }
    )
  }
}

