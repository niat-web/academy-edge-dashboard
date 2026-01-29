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

    // Extract assessment scores
    const assessmentScores = assessmentData.scores || {}

    // Build prompt
    const prompt = `**You are a senior technical interviewer and hiring advisor.

Your task is to generate a structured, professional evaluation for a candidate based on the data provided.

Maintain a positive, constructive, and industry-appropriate tone throughout.

Do not mention raw scores explicitly unless required for context.

Do not include any negative or harsh language.

Frame all gaps as growth opportunities.**

---

## INPUT DATA

### 1. Assessment Scores

**Important:** In the assessment scores data:
- **student_score** fields represent the score achieved by the student
- **section_score** fields represent the total marks that can be obtained in that section

\`\`\`json
${JSON.stringify(assessmentScores, null, 2)}
\`\`\`

### 2. TR1 Interview Data

\`\`\`json
${JSON.stringify(tr1Data, null, 2)}
\`\`\`

### 3. TR2 Interview Data

\`\`\`json
${JSON.stringify(tr2Data, null, 2)}
\`\`\`

---

## DECISION-MAKING INSTRUCTIONS

**Make your evaluation and recommendation decisions based on:**
- Assessment scores (student performance relative to section totals)
- TR1 interview scores and ratings (problem-solving, coding implementation, communication, DSA theory, CS fundamentals)
- TR2 interview scores and ratings (frontend, backend, projects, experience, soft skills)

**Use the scores and ratings from TR1 and TR2 to:**
- Determine the candidate's technical strengths and areas for growth
- Assess their fit for different role types
- Make informed recommendations about role suitability

---

## OUTPUT REQUIREMENTS (STRICT)

Generate the output in **valid JSON format** exactly matching the structure below.

Do NOT add extra fields.

Do NOT add explanations outside JSON.

---

## SECTION-WISE INSTRUCTIONS

### A. Assessment Remarks

* Generate **1–3 lines**

* Base remarks on relative performance across sections

* Highlight strengths such as problem solving, consistency, or aptitude

* Keep tone encouraging and concise

---

### B. TR1 Interview Remarks

* Generate **1–3 lines**

* Emphasize:

  * problem-solving approach

  * communication

  * coding implementation

* Reference interview observations indirectly

* Keep tone professional and balanced

---

### C. TR2 Overall Remarks

* Generate **1–3 lines**

* Focus on:

  * practical exposure

  * technical understanding

  * system thinking

* Avoid listing weaknesses directly

---

### D. Technical Strengths (TR2-Driven)

* Generate **3–5 bullet points**

* Each point must be:

  * concise

  * skill-oriented

  * positively framed

* Examples (do NOT copy):

  * Backend reasoning

  * System understanding

  * Practical problem solving

---

### E. Development Areas (Positive Framing) (TR2- Driven)

* Generate **3–5 bullet points**

* Phrase each as a **growth opportunity**

* No negative wording

* No comparison to peers

---

### F. Recommended Role Fit (TR2- Driven)

* Output **paragraph concise skill oriented**

* **MUST explicitly mention 2–4 specific role titles** within the paragraph

* Roles must align with:

  * entry-level / early-career profiles

  * implementation-heavy responsibilities

* The paragraph should discuss role fit while clearly stating the recommended role titles

* Example format (roles should be mentioned in the paragraph):

\`\`\`text
The candidate demonstrates strong alignment with roles such as Software Development Engineer (Entry Level) and Backend Engineer – Junior, given their...
\`\`\`

---

### G. Why This Candidate (Positive Justification)

* Generate **2–3 bullet points**

* Explain **why the candidate fits the recommended roles**

* Focus on:

  * learning ability

  * implementation skills

  * adaptability

* No repetition of strengths section

---

### H. Overall Summary (All Sections Combined)

* Generate **3–4 lines**

* Summarize performance across:

  * Assessment

  * TR1

  * TR2

* Keep executive-readable tone

* No scores, no numbers

### I.  Role Fit 

* Output **ONLY role titles**

* No sentences, no explanations

* Provide **2–4 roles**

* Roles must align with:

  * entry-level / early-career profiles

  * implementation-heavy responsibilities

* Example format:

\`\`\`text
Software Development Engineer (Entry Level)
Backend Engineer – Junior
\`\`\`

---

## FINAL OUTPUT FORMAT (MANDATORY)

\`\`\`json
{
  "assessment_remarks": "string",
  "tr1_remarks": "string",
  "tr2_overall_remarks": "string",
  "technical_strengths": [
    "string",
    "string",
    "string"
  ],
  "development_areas": [
    "string",
    "string",
    "string"
  ],
  "recommended_role_fit": "string",
  "why_this_candidate": [
    "string",
    "string"
  ],
  "role_fit": [
    "string",
    "string"
  ],
  "overall_summary": "string",
  "recommendation": "Strong Hire" | "Hire" | "Weak Hire"
}
\`\`\`

---

## IMPORTANT RULES (DO NOT VIOLATE)

* ❌ No negative wording
* ❌ No rejection language
* ❌ No emojis
* ❌ No markdown
* ❌ No extra keys
* ❌ No repetition across sections
* ✅ Professional hiring language only
* ✅ Suitable for internal hiring dashboards

---

## MODEL BEHAVIOR CONSTRAINT

If information is limited:

* Make reasonable inferences
* Prefer conservative, positive interpretations
* Avoid hallucinated facts

---`

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

    // Parse new fields
    const assessment_remarks: string = String(parsed.assessment_remarks || '')
    const tr1_remarks: string = String(parsed.tr1_remarks || '')
    const tr2_overall_remarks: string = String(parsed.tr2_overall_remarks || '')
    const technical_strengths: string[] = normalizeStringArray(parsed.technical_strengths)
    const development_areas: string[] = normalizeStringArray(parsed.development_areas)
    const recommended_role_fit: string | undefined = parsed.recommended_role_fit
      ? String(parsed.recommended_role_fit)
      : undefined
    const why_this_candidate: string[] = normalizeStringArray(parsed.why_this_candidate)
    const role_fit: string[] = normalizeStringArray(parsed.role_fit)
    const overall_summary: string = String(parsed.overall_summary || '')

    // Handle recommendation field
    let recommendation: string = 'Weak Hire'
    if (allowedRecommendations.includes(parsed.recommendation)) {
      recommendation = parsed.recommendation
    }

    // Backward compatibility: map new fields to old structure if needed
    // Use overall_summary as summary, technical_strengths as strengths, development_areas as improvements
    const summary: string = overall_summary || String(parsed.summary || '')
    const strengths: string[] = technical_strengths.length > 0
      ? technical_strengths
      : normalizeStringArray(parsed.strengths)
    const improvements: string[] = development_areas.length > 0
      ? development_areas
      : normalizeStringArray(parsed.improvements)

    // Handle legacy justification field if present
    const justification: string | undefined = parsed.justification
      ? String(parsed.justification)
      : undefined

    if (justification && strengths.length > 0) {
      strengths.unshift(`Overall justification: ${justification}`)
    }

    // Calculate cumulative score and percentile
    const assessmentScoreVal = parseFloat(String(assessmentScores.student_assessment_score || 0))
    const tr1ScoreVal = parseFloat(String(tr1Data.total_score || 0))
    const tr2ScoreVal = parseFloat(String(tr2Data.overall_score || 0))
    const totalScore = assessmentScoreVal + tr1ScoreVal + tr2ScoreVal

    // Linear Score Mapping Logic (0.1% to 0.5%)
    // Based on the cohort of students who reached the final verdict stage
    const minScore = 200 // Assumed baseline min score for finalists
    const maxScore = 350 // Assumed baseline max score for top performers

    let topPercentage = 0.5 - ((totalScore - minScore) / (maxScore - minScore)) * (0.5 - 0.1)

    // Clamp values to ensure they stay within [0.1, 0.5]
    topPercentage = Math.max(0.1, Math.min(0.5, topPercentage))

    // Section-specific percentiles (Linear Mapping)
    const sectionPercentiles: Record<string, number> = {}
    const sections = [
      { key: 'coding', student: 'coding_student_score', max: 'coding_section_score', minScore: 50, maxScore: 100 },
      { key: 'dsa_mcq', student: 'dsa_student_score', max: 'dsa_section_score', minScore: 40, maxScore: 100 },
      { key: 'cs_fundamentals', student: 'cs_fundamentals_student_score', max: 'cs_fundamentals_section_score', minScore: 40, maxScore: 100 },
      { key: 'quantitative', student: 'quantitative_student_score', max: 'quantitative_section_score', minScore: 10, maxScore: 30 },
      { key: 'logical', student: 'logical_student_score', max: 'logical_section_score', minScore: 10, maxScore: 30 },
      { key: 'verbal', student: 'verbal_student_score', max: 'verbal_section_score', minScore: 10, maxScore: 30 }
    ]

    for (const section of sections) {
      const score = parseFloat(String(assessmentScores[section.student] || 0))
      if (score > 0) {
        let p = 0.5 - ((score - section.minScore) / (section.maxScore - section.minScore)) * (0.5 - 0.1)
        p = Math.max(0.1, Math.min(0.5, p))
        // Only add if performance is "good" (e.g., student score is >= 70% of the section max)
        const sectionMax = parseFloat(String(assessmentScores[section.max] || 100))
        if (score >= sectionMax * 0.7) {
          sectionPercentiles[section.key] = p
        }
      }
    }

    const finalVerdict = {
      // New fields
      assessment_remarks,
      tr1_remarks,
      tr2_overall_remarks,
      technical_strengths,
      development_areas,
      recommended_role_fit,
      why_this_candidate,
      role_fit,
      overall_summary,
      recommendation,
      // Score and Rank fields
      total_cumulative_score: totalScore,
      top_percentage: topPercentage <= 0.5 ? topPercentage : null,
      percentile_rank: topPercentage,
      section_percentiles: Object.keys(sectionPercentiles).length > 0 ? sectionPercentiles : undefined,
      // Legacy fields for backward compatibility
      summary,
      strengths,
      improvements,
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
 * Generate verdicts for students who don't have one
 * Processes as many as possible within the Vercel time limit (300s)
 */
export async function generateVerdictsForAllStudents(maxToProcess: number = 50): Promise<{
  total: number
  processed: number
  succeeded: number
  failed: number
  errors: Array<{ student_uid: string; error: string }>
}> {
  const START_TIME = Date.now()
  const TIME_LIMIT_MS = 250000 // 250 seconds safety limit for Vercel 300s limit

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

    const totalNeeding = studentsNeedingVerdicts.length

    let processed = 0
    let succeeded = 0
    let failed = 0
    const errors: Array<{ student_uid: string; error: string }> = []

    console.log(`Found ${totalNeeding} students needing verdicts. Starting time-aware processing...`)

    // Process sequentially until time runs out or all are done
    for (const student of studentsNeedingVerdicts) {
      // Check if we are approaching the Vercel timeout
      const elapsed = Date.now() - START_TIME
      if (elapsed > TIME_LIMIT_MS) {
        console.warn(`[TIME-LIMIT] Stopping processing at ${elapsed}ms to avoid Vercel timeout. Processed ${processed}/${totalNeeding}`)
        break
      }

      // Stop if we hit the guardrail limit (default 50)
      if (processed >= maxToProcess) {
        console.log(`[LIMIT] Reached safety limit of ${maxToProcess} students. Stopping.`)
        break
      }

      const result = await generateVerdictForStudent(student.student_uid)
      processed++

      if (result.success) {
        succeeded++
        console.log(`✓ Generated verdict for ${student.student_uid} (${processed}/${totalNeeding})`)
      } else {
        failed++
        errors.push({
          student_uid: student.student_uid,
          error: result.error || 'Unknown error',
        })
        console.error(`✗ Failed to generate verdict for ${student.student_uid}: ${result.error}`)
      }

      // Small delay between requests to avoid hitting rate limits
      if (processed < totalNeeding) {
        await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms delay
      }
    }

    return {
      total: totalNeeding,
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

