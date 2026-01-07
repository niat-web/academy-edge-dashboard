import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { generateVerdict } from '@/lib/gemini'

type Recommendation = 'Strong Hire' | 'Hire' | 'Weak Hire' | 'Low Hire'

interface FinalVerdict {
  summary: string
  strengths: string[]
  improvements: string[]
  recommendation: Recommendation
  generated_at: Date
  model: string // Allow any model name that works
}

export async function GET(
  request: Request,
  context: { params: Promise<{ student_uid: string }> }
) {
  try {
    const { student_uid } = await context.params

    const client = await clientPromise
    const db = client.db('student_dashboard')

    // 1. Check if AI-generated verdict already exists in final_verdicts collection
    const existing = await db
      .collection('final_verdicts')
      .findOne<FinalVerdict & { student_uid: string }>(
        { student_uid }
      )

    // If verdict exists, return it immediately (don't generate)
    if (existing) {
      // Remove student_uid from response (it's just for DB lookup)
      const { student_uid: _, ...verdict } = existing
      return NextResponse.json({
        status: 'ok',
        data: verdict,
      })
    }

    // 2. Fetch assessment, TR1 and TR2 data (no PII / IDs)
    const [assessmentStudent, tr1Student, tr2Student] = await Promise.all([
      db
        .collection('students')
        .findOne<{ assessment?: any }>(
          { student_uid },
          { projection: { assessment: 1, _id: 0 } }
        ),
      db
        .collection('students-tr1')
        .findOne<{ tr1?: any }>(
          { student_uid },
          { projection: { tr1: 1, _id: 0 } }
        ),
      db
        .collection('students-tr2')
        .findOne<{ tr2?: any }>(
          { student_uid },
          { projection: { tr2: 1, _id: 0 } }
        ),
    ])

    if (!assessmentStudent && !tr1Student && !tr2Student) {
      return NextResponse.json(
        { status: 'error', message: 'Candidate data not found' },
        { status: 404 }
      )
    }

    const assessmentData = assessmentStudent?.assessment || {}
    const tr1Data = tr1Student?.tr1 || {}
    const tr2Data = tr2Student?.tr2 || {}

    // 3. Build structured prompt for Gemini
    const prompt = `
You are a senior technical interviewer.

Based on the following assessment data, TR1 interview, and TR2 interview,
generate a final candidate evaluation.

Be objective and professional. Avoid vague language.

You MUST respond ONLY with a valid JSON object in the following exact format:
{
  "summary": "string, 3-4 sentences overall summary",
  "strengths": ["bullet point 1", "bullet point 2", "..."],
  "improvements": ["bullet point 1", "bullet point 2", "..."],
  "recommendation": "Strong Hire" | "Hire" | "Weak Hire" | "Low Hire",
  "justification": "short paragraph justifying the recommendation"
}

Rules:
- Choose exactly ONE recommendation from: Strong Hire, Hire, Weak Hire, Low Hire.
- Do not include any additional fields.
- Do not include any introductory or closing text outside the JSON.

Assessment:
${JSON.stringify(assessmentData, null, 2)}

TR1:
${JSON.stringify(tr1Data, null, 2)}

TR2:
${JSON.stringify(tr2Data, null, 2)}
`.trim()

    const result = await generateVerdict(prompt)
    const rawResponse = result.text
    const usedModel = result.model

    // 4. Parse model output as JSON (best-effort)
    let parsed: any
    try {
      // Try direct parse first
      parsed = JSON.parse(rawResponse)
    } catch {
      // Fallback: extract JSON substring between first '{' and last '}'
      const firstBrace = rawResponse.indexOf('{')
      const lastBrace = rawResponse.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = rawResponse.slice(firstBrace, lastBrace + 1)
        parsed = JSON.parse(jsonSubstring)
      } else {
        throw new Error('Gemini response was not valid JSON')
      }
    }

    const allowedRecommendations: Recommendation[] = [
      'Strong Hire',
      'Hire',
      'Weak Hire',
      'Low Hire',
    ]

    const normalizeStringArray = (value: any): string[] => {
      if (!value) return []
      if (Array.isArray(value)) return value.map((v) => String(v))
      // Split bullet-style text into lines
      return String(value)
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean)
    }

    const summary: string = String(parsed.summary || '')
    const strengths: string[] = normalizeStringArray(parsed.strengths)
    const improvements: string[] = normalizeStringArray(parsed.improvements)

    let recommendation: Recommendation = 'Low Hire'
    if (allowedRecommendations.includes(parsed.recommendation)) {
      recommendation = parsed.recommendation as Recommendation
    }

    // We keep justification as the first element of strengths/improvements context
    const justification: string | undefined = parsed.justification
      ? String(parsed.justification)
      : undefined

    if (justification) {
      strengths.unshift(`Overall justification: ${justification}`)
    }

    const finalVerdict: FinalVerdict = {
      summary,
      strengths,
      improvements,
      recommendation,
      generated_at: new Date(),
      model: usedModel || 'gemini-1.5-flash', // Use the model that actually worked
    }

    // 5. Persist verdict in final_verdicts collection
    const now = new Date()
    await db.collection('final_verdicts').updateOne(
      { student_uid },
      { 
        $set: { 
          ...finalVerdict,
          student_uid,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      status: 'ok',
      data: finalVerdict,
    })
  } catch (error: any) {
    console.error('Error generating AI verdict:', error)
    return NextResponse.json(
      { status: 'error', message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


