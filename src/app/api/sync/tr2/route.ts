import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

/**
 * TR2 Header → Schema mapping
 * Header names MUST match row-2 headers exactly
 */
const TR2_FIELD_MAP: Record<string, string> = {
  'Interview Date': 'interview_date',
  'Interview Panelist Name': 'interview_panelist_name',
  'Recording Link': 'recording_link',
  'Interview status': 'interview_status',

  'Presentability': 'soft_skills.presentability',
  'Communication (3mins discussion)': 'soft_skills.communication',

  'Communication & Project Rating': 'projects.communication_project_rating',
  'Projects Explanation': 'projects.projects_explanation',
  'Projects Type': 'projects.projects_type',
  'Project Rating': 'projects.project_rating',

  'Basic HTML, CSS, JavaScript Theory Questions': 'frontend.html_css_js_theory',
  'React Advance & Frontend Architecture Questions': 'frontend.react_architecture',
  'JavaScript /React JS (1 MediumLevel)': 'frontend.react_coding',
  'Frontend Score': 'frontend.frontend_score',

  'Node.js & Express.js Theory Discussion': 'backend.node_express_theory',
  'MongoDB Theory & Query Discussion': 'backend.mongodb_theory',
  'Backend Architecture Questions': 'backend.backend_architecture',
  'Backend Endpoint': 'backend.backend_endpoint',
  'Backend Score': 'backend.backend_score',

  'CS Fundamentals': 'experience.cs_fundamentals',
  'Scenario-Based Questions (Full Stack Integration)': 'experience.scenario_based_questions',
  'Internships & Practical Experience': 'experience.internships_experience',
  'Ability to Explain Internship Tasks': 'experience.internship_explanation',
  'Certificates & Achievements': 'experience.certificates',
  'Intenship Score': 'experience.internship_score',

  'AI Knowledge': 'ai_knowledge',
  'Overall Score': 'overall_score',
  'Overall Remarks': 'overall_remarks',
}

/**
 * Utility to safely set deep nested values
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

    // 2. Fetch TR2 subsheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.TR2_SHEET_ID,
      range: process.env.TR2_SHEET_NAME,
    })

    const rows = response.data.values || []

    if (rows.length < 3) {
      return NextResponse.json({
        status: 'ok',
        upsertedCount: 0,
        skippedRows: 0,
        message: 'No TR2 data found',
      })
    }

    // 3. Header + data rows
    const HEADER_ROW_INDEX = 1
    const DATA_START_INDEX = 2

    const headers = rows[HEADER_ROW_INDEX]

    // 4. Required base columns
    const uidIndex = headers.indexOf('Candidate UID')
    const nameIndex = headers.indexOf('Candidate Name')
    const collegeIndex = headers.indexOf('College name') 
    console.log('college :', collegeIndex);
    

    if (uidIndex === -1) {
      throw new Error(`Candidate UID column not found`)
    }

    // 5. MongoDB
    const client = await clientPromise
    const db = client.db('student_dashboard')

    let upsertedCount = 0
    let skippedRows = 0

    // 6. Process each student row
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

      // 7. Build structured TR2 object
      const structuredTR2: any = {}

      for (const [header, path] of Object.entries(TR2_FIELD_MAP)) {
        const colIndex = headers.indexOf(header)
        if (colIndex === -1) continue

        const value = row[colIndex] ?? ''
        setNestedValue(structuredTR2, path, value)
      }

      // 8. Upsert student
      await db.collection('students-tr2').updateOne(
        { student_uid },
        {
          $set: {
            student_uid,
            basic_info: {
              name: nameIndex !== -1 ? row[nameIndex] : '',
              university: collegeIndex !== -1 ? (row[collegeIndex] ?? '') : '',
            },
            tr2: structuredTR2,
            'progress.tr2_completed': true,
            'timestamps.updated_at': new Date(),
          },
          $setOnInsert: {
            'timestamps.created_at': new Date(),
          },
        },
        { upsert: true }
      )

      upsertedCount++
    }

    return NextResponse.json({
      status: 'ok',
      upsertedCount,
      skippedRows,
    })
  } catch (error: any) {
    console.error('TR2 sync failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'TR2 sync failed',
      },
      { status: 500 }
    )
  }
}
