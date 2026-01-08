import clientPromise from '@/lib/mongodb'
import { generateVerdict } from '@/lib/gemini'

const GEMINI_RATE_LIMIT = {
  requestsPerMinute: 15, // Conservative limit for Gemini API
  requestsPerHour: 900,
}

interface RateLimiter {
  requests: number[]
  hourRequests: number[]
}

const rateLimiter: RateLimiter = {
  requests: [],
  hourRequests: [],
}

/**
 * Check if we can make a Gemini API request based on rate limits
 */
function canMakeRequest(): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60 * 1000
  const oneHourAgo = now - 60 * 60 * 1000

  // Clean old requests
  rateLimiter.requests = rateLimiter.requests.filter((time) => time > oneMinuteAgo)
  rateLimiter.hourRequests = rateLimiter.hourRequests.filter((time) => time > oneHourAgo)

  // Check limits
  if (rateLimiter.requests.length >= GEMINI_RATE_LIMIT.requestsPerMinute) {
    return false
  }
  if (rateLimiter.hourRequests.length >= GEMINI_RATE_LIMIT.requestsPerHour) {
    return false
  }

  return true
}

/**
 * Record a Gemini API request
 */
function recordRequest() {
  const now = Date.now()
  rateLimiter.requests.push(now)
  rateLimiter.hourRequests.push(now)
}

/**
 * Wait until we can make a request (with timeout)
 */
async function waitForRateLimit(timeoutMs: number = 60000): Promise<boolean> {
  const startTime = Date.now()
  while (!canMakeRequest()) {
    if (Date.now() - startTime > timeoutMs) {
      return false
    }
    // Wait 1 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return true
}

/**
 * Generate verdict for a single student with error handling
 */
export async function generateVerdictForStudent(student_uid: string): Promise<{
  success: boolean
  error?: string
  verdict?: any
}> {
  try {
    const client = await clientPromise
    const db = client.db('student_dashboard')

    // Check if verdict already exists
    const existing = await db.collection('final_verdicts').findOne({ student_uid })
    if (existing) {
      return { success: true, verdict: existing }
    }

    // Wait for rate limit if needed
    const canProceed = await waitForRateLimit(60000) // 1 minute timeout
    if (!canProceed) {
      return {
        success: false,
        error: 'Rate limit timeout - too many requests in progress',
      }
    }

    // Fetch student data
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

    // Validate data exists
    if (!assessmentStudent && !tr1Student && !tr2Student) {
      return {
        success: false,
        error: 'No assessment, TR1, or TR2 data available',
      }
    }

    const assessmentData = assessmentStudent?.assessment || {}
    const tr1Data = tr1Student?.tr1 || {}
    const tr2Data = tr2Student?.tr2 || {}

    // Check if we have at least some data
    const hasData =
      Object.keys(assessmentData).length > 0 ||
      Object.keys(tr1Data).length > 0 ||
      Object.keys(tr2Data).length > 0

    if (!hasData) {
      return {
        success: false,
        error: 'No valid data found for verdict generation',
      }
    }

    // Build prompt
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
  "recommendation": "Strong Hire" | "Hire" | "Weak Hire",
  "justification": "short paragraph justifying the recommendation"
}

Rules:
- Choose exactly ONE recommendation from: Strong Hire, Hire, Weak Hire.
- Do not include any additional fields.
- Do not include any introductory or closing text outside the JSON.

Assessment:
${JSON.stringify(assessmentData, null, 2)}

TR1:
${JSON.stringify(tr1Data, null, 2)}

TR2:
${JSON.stringify(tr2Data, null, 2)}
`.trim()

    // Record request before making it
    recordRequest()

    // Generate verdict
    const result = await generateVerdict(prompt)
    const rawResponse = result.text
    const usedModel = result.model

    // Parse response
    let parsed: any
    try {
      parsed = JSON.parse(rawResponse)
    } catch {
      const firstBrace = rawResponse.indexOf('{')
      const lastBrace = rawResponse.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = rawResponse.slice(firstBrace, lastBrace + 1)
        parsed = JSON.parse(jsonSubstring)
      } else {
        throw new Error(`Failed to parse ${usedModel.includes('mistral') ? 'Mistral' : 'Gemini'} response as JSON`)
      }
    }

    // Normalize data
    const allowedRecommendations = ['Strong Hire', 'Hire', 'Weak Hire']

    const normalizeStringArray = (value: any): string[] => {
      if (!value) return []
      if (Array.isArray(value)) return value.map((v) => String(v))
      return String(value)
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean)
    }

    const summary: string = String(parsed.summary || '')
    const strengths: string[] = normalizeStringArray(parsed.strengths)
    const improvements: string[] = normalizeStringArray(parsed.improvements)

    let recommendation: string = 'Weak Hire'
    if (allowedRecommendations.includes(parsed.recommendation)) {
      recommendation = parsed.recommendation
    }

    const justification: string | undefined = parsed.justification
      ? String(parsed.justification)
      : undefined

    if (justification) {
      strengths.unshift(`Overall justification: ${justification}`)
    }

    const finalVerdict = {
      summary,
      strengths,
      improvements,
      recommendation,
      generated_at: new Date(),
      model: usedModel,
    }

    // Save to database
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
        },
      },
      { upsert: true }
    )

    return { success: true, verdict: finalVerdict }
  } catch (error: any) {
    console.error(`Error generating verdict for ${student_uid}:`, error)
    return {
      success: false,
      error: error.message || 'Unknown error',
    }
  }
}

/**
 * Generate verdicts for all students who don't have one
 * Processes in batches with rate limiting
 */
export async function generateVerdictsForAllStudents(batchSize: number = 10): Promise<{
  total: number
  processed: number
  succeeded: number
  failed: number
  errors: Array<{ student_uid: string; error: string }>
}> {
  try {
    const client = await clientPromise
    const db = client.db('student_dashboard')

    // Get all students from students-tr2 (they should have verdicts)
    const allStudents = await db
      .collection('students-tr2')
      .find({}, { projection: { student_uid: 1 } })
      .toArray()

    // Get students who already have verdicts
    const studentsWithVerdicts = await db
      .collection('final_verdicts')
      .find({}, { projection: { student_uid: 1 } })
      .toArray()

    const verdictUids = new Set(
      studentsWithVerdicts.map((s: any) => s.student_uid).filter(Boolean)
    )

    // Filter to students without verdicts
    const studentsNeedingVerdicts = allStudents.filter(
      (s: any) => s.student_uid && !verdictUids.has(s.student_uid)
    )

    const total = studentsNeedingVerdicts.length
    let processed = 0
    let succeeded = 0
    let failed = 0
    const errors: Array<{ student_uid: string; error: string }> = []

    console.log(`Found ${total} students needing verdicts`)

    // Process in batches
    for (let i = 0; i < studentsNeedingVerdicts.length; i += batchSize) {
      const batch = studentsNeedingVerdicts.slice(i, i + batchSize)

      // Process batch sequentially to respect rate limits
      for (const student of batch) {
        const result = await generateVerdictForStudent(student.student_uid)
        processed++

        if (result.success) {
          succeeded++
          console.log(`✓ Generated verdict for ${student.student_uid} (${processed}/${total})`)
        } else {
          failed++
          errors.push({
            student_uid: student.student_uid,
            error: result.error || 'Unknown error',
          })
          console.error(`✗ Failed to generate verdict for ${student.student_uid}: ${result.error}`)
        }

        // Small delay between requests to avoid hitting rate limits
        if (processed < total) {
          await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay
        }
      }
    }

    return {
      total,
      processed,
      succeeded,
      failed,
      errors,
    }
  } catch (error: any) {
    console.error('Error in generateVerdictsForAllStudents:', error)
    throw error
  }
}

