import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

/**
 * TR1 Header → Schema mapping
 * Header names MUST match row-2 headers exactly
 */
const TR1_FIELD_MAP: Record<string, string> = {
  'Interview Date': 'interview_date',
  'Interview Panelist': 'interview_panelist',
  'Interview Recording Link': 'interview_recording_link',
  'Coding Problem asked': 'coding_problem_asked',

  'Communication': 'communication',
  'Remarks on Communication': 'remarks_on_communication',
  'Remarks on Internships & Projects': 'remarks_on_internships_projects',

  'Problem 1 - Problem Solving (Rating out of 5)': 'problem_1.problem_solving_rating',
  'Problem 1 - Remarks on Problem Solving': 'problem_1.problem_solving_remarks',
  'Problem 1 - Code Implementation (Rating out of 5)': 'problem_1.code_implementation_rating',
  'Problem 1 - Remarks on Code Implementation': 'problem_1.code_implementation_remarks',

  'Problem 2 - Problem Solving (Rating out of 5)': 'problem_2.problem_solving_rating',
  'Problem 2 - Remarks on Problem Solving': 'problem_2.problem_solving_remarks',
  'Problem 2 - Code Implementation (Rating out of 5)': 'problem_2.code_implementation_rating',
  'Problem 2 - Remarks on Code Implementation': 'problem_2.code_implementation_remarks',

  'DSA Theory': 'dsa_theory',
  'Remarks on DSA Theory': 'remarks_on_dsa_theory',
  'Core CS Theory': 'core_cs_theory',
  'Remarks on Core CS Theory': 'remarks_on_core_cs_theory',

  'Overall Comments': 'overall_comments',
  'Total Score (out of 100)': 'total_score',
  'DSA CD Team Remarks': 'dsa_cd_team_remarks',
}

/**
 * Utility to safely set nested values
 */
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

export async function POST() {
  try {
    // 1. Google Sheets client
    const sheets = getSheetsClient()

    // 2. Fetch TR1 sheet (fall back to TR2 env vars if TR1 not provided)
    const spreadsheetId = process.env.TR1_SHEET_ID ?? process.env.TR2_SHEET_ID
    const range = process.env.TR1_SHEET_NAME ?? process.env.TR2_SHEET_NAME

    if (!spreadsheetId || !range) {
      throw new Error('Sheet ID or sheet name not configured for TR1')
    }

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range })

    const rows = response.data.values || []

    if (rows.length < 3) {
      return NextResponse.json({
        status: 'ok',
        updatedCount: 0,
        skippedRows: 0,
        message: 'No TR1 data found',
      })
    }

    // 3. Header & data rows
    const DATA_START_INDEX = 2

    // Try to detect header row dynamically (sometimes header is row 0 or 1)
    function normalizeCell(v: any) {
      return (v || '').toString().trim()
    }

    let HEADER_ROW_INDEX = -1
    const UID_CANDIDATES = ['uids', 'uid', 'candidate uid']
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const candidateRow = rows[r] || []
      for (const cell of candidateRow) {
        const norm = normalizeCell(cell).toLowerCase()
        if (UID_CANDIDATES.includes(norm)) {
          HEADER_ROW_INDEX = r
          break
        }
      }
      if (HEADER_ROW_INDEX !== -1) break
    }

    // Fallback to row 1 if detection failed
    if (HEADER_ROW_INDEX === -1) HEADER_ROW_INDEX = 1

    const headersRaw = rows[HEADER_ROW_INDEX] || []
    const headers = headersRaw.map((h: any) => normalizeCell(h))

    function findHeaderIndexNormalized(headersArr: string[], candidates: string[]) {
      const low = headersArr.map((h) => h.toLowerCase())
      for (const candidate of candidates) {
        const ci = low.indexOf(candidate.toLowerCase())
        if (ci !== -1) return ci
      }
      return -1
    }

    const uidIndex = findHeaderIndexNormalized(headers, ['UIDs', 'UID', 'Candidate UID', 'UIDs'])
    if (uidIndex === -1) {
      throw new Error('UID column not found in TR1 sheet')
    }

    // 5. MongoDB
    const client = await clientPromise
    const db = client.db('student_dashboard')

    let updatedCount = 0
    let skippedRows = 0
    const bulkOps = []

    // 6. Process rows
    for (let i = DATA_START_INDEX; i < rows.length; i++) {
      const row = rows[i]

      const rawUid = row[uidIndex]
      if (!rawUid || typeof rawUid !== 'string') {
        skippedRows++
        continue
      }

      const student_uid = rawUid.trim()
      if (!student_uid) {
        skippedRows++
        continue
      }

      // 8. Build structured TR1 object
      const structuredTR1: any = {}

      for (const [header, path] of Object.entries(TR1_FIELD_MAP)) {
        const colIndex = findHeaderIndexNormalized(headers, [header])
        if (colIndex === -1) continue

        const value = row[colIndex] ?? ''
        setNestedValue(structuredTR1, path, value)
      }

      // 9. Prepare bulk operation for students-tr1
      bulkOps.push({
        updateOne: {
          filter: { student_uid },
          // NOTE: We don't check for existence here to keep it fast, 
          // but we only process students that exist in students-tr2 if needed.
          // For now, mirroring TR1's behavior but in bulk.
          update: {
            $set: {
              student_uid,
              tr1: structuredTR1,
              'progress.tr1_completed': true,
              'timestamps.updated_at': new Date(),
            },
            $setOnInsert: {
              'timestamps.created_at': new Date(),
            },
          },
          upsert: true
        }
      })

      updatedCount++
    }

    // 10. Execute Bulk Write
    if (bulkOps.length > 0) {
      await db.collection('students-tr1').bulkWrite(bulkOps)
    }

    return NextResponse.json({
      status: 'ok',
      updatedCount,
      skippedRows,
    })
  } catch (error: any) {
    console.error('TR1 sync failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'TR1 sync failed',
      },
      { status: 500 }
    )
  }
}
