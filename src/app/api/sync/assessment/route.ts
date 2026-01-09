import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

const RAW_DATA_TAB_NAME = 'raw data'

const ASSESSMENT_FIELD_MAP: Record<string, string> = {
  'Student Assessment Score': 'scores.student_assessment_score',
  'Coding Student Score': 'scores.coding_student_score',
  'Coding Section Score': 'scores.coding_section_score',
  'DSA Student Score': 'scores.dsa_student_score',
  'DSA Section Score': 'scores.dsa_section_score',
  'CS Fundamentals Student Score': 'scores.cs_fundamentals_student_score',
  'CS Fundamentals Section Score': 'scores.cs_fundamentals_section_score',
  'Quantitative Aptitude Student Score': 'scores.quantitative_student_score',
  'Quantitative Aptitude Section Score': 'scores.quantitative_section_score',
  'Verbal Ability Student Score': 'scores.verbal_student_score',
  'Verbal Ability Section Score': 'scores.verbal_section_score',
  'Logical Reasoning Student Score': 'scores.logical_student_score',
  'Logical Reasoning Section Score': 'scores.logical_section_score',
  'Report Links': 'report_links',
}

function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {}
    current = current[keys[i]]
  }
  current[keys[keys.length - 1]] = value
}

export async function POST() {
  try {
    const sheets = getSheetsClient()
    const client = await clientPromise
    const db = client.db('student_dashboard')

    // Get all student_uid values from students-tr2 collection for filtering
    const tr2Students = await db.collection('students-tr2')
      .find({}, { projection: { student_uid: 1 } })
      .toArray()
    
    const validStudentUids = new Set(
      tr2Students
        .map((s: any) => s.student_uid)
        .filter((uid: any) => uid) // Filter out null/undefined
    )

    console.log(`Found ${validStudentUids.size} valid student_uid values from students-tr2 collection`)

    const colleges = await db.collection('college_sheets').find().toArray()

    let upsertedCount = 0
    let skippedRows = 0
    let notInTr2Count = 0

    for (const college of colleges) {
      const sheetId = college.sheet_id
      const collegeName = college.college_name

      if (!sheetId) {
        console.warn(`Skipping ${collegeName}: No sheet_id found`)
        skippedRows++
        continue
      }

      try {
        // Format range properly: try different formats for sheet names with spaces
        // Use A:ZZ to capture more columns (up to column ZZ = 702 columns)
        let response
        try {
          const range = `'${RAW_DATA_TAB_NAME}'!A:ZZ`
          response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
          })
        } catch (rangeError: any) {
          // If quoted format fails, try without quotes
          if (rangeError.message?.includes('parse range')) {
            const range = `${RAW_DATA_TAB_NAME}!A:ZZ`
            response = await sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: range,
            })
          } else {
            throw rangeError
          }
        }

        const rows = response.data.values || []
        if (rows.length < 2) {
          console.warn(`Skipping ${collegeName}: Not enough data rows (${rows.length})`)
          skippedRows++
          continue
        }

        const headers = rows[0]
        const uidIndex = headers.indexOf('Student ID')
        const nameIndex = headers.indexOf('Candidate Name') !== -1 
          ? headers.indexOf('Candidate Name')
          : headers.indexOf('Student Name') !== -1
          ? headers.indexOf('Student Name')
          : headers.indexOf('Name')

        if (uidIndex === -1) {
          console.warn(`Skipping ${collegeName}: Student ID column not found. Available headers: ${headers.slice(0, 10).join(', ')}...`)
          skippedRows++
          continue
        }

        // Log unmapped columns for debugging
        const mappedHeaders = Object.keys(ASSESSMENT_FIELD_MAP)
        const unmappedHeaders = headers.filter((h: string) => 
          h && 
          h !== 'Student ID' && 
          h !== 'Candidate Name' && 
          h !== 'Student Name' && 
          h !== 'Name' &&
          !mappedHeaders.includes(h)
        )
        if (unmappedHeaders.length > 0) {
          console.log(`[${collegeName}] Unmapped columns (${unmappedHeaders.length}): ${unmappedHeaders.slice(0, 10).join(', ')}${unmappedHeaders.length > 10 ? '...' : ''}`)
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const rawUid = row[uidIndex]

          if (!rawUid) {
            skippedRows++
            continue
          }

          const student_uid = rawUid.trim()
          if (!student_uid) {
            skippedRows++
            continue
          }

          // Only process students whose student_uid exists in students-tr2 collection
          if (!validStudentUids.has(student_uid)) {
            notInTr2Count++
            continue
          }

          const assessment: any = {}

          // Map known fields from ASSESSMENT_FIELD_MAP
          for (const [header, path] of Object.entries(ASSESSMENT_FIELD_MAP)) {
            const colIndex = headers.indexOf(header)
            if (colIndex === -1) continue
            const value = row[colIndex] ?? ''
            if (value !== '') { // Only set non-empty values
              setNestedValue(assessment, path, value)
            }
          }

          // Store all other columns in a raw_data field for reference
          const rawData: Record<string, any> = {}
          headers.forEach((header: string, index: number) => {
            if (header && 
                header !== 'Student ID' && 
                header !== 'Candidate Name' && 
                header !== 'Student Name' && 
                header !== 'Name' &&
                !Object.keys(ASSESSMENT_FIELD_MAP).includes(header)) {
              const value = row[index]
              if (value !== undefined && value !== '') {
                rawData[header] = value
              }
            }
          })
          
          // Add raw_data if there are unmapped fields
          if (Object.keys(rawData).length > 0) {
            assessment.raw_data = rawData
          }

          await db.collection('students').updateOne(
            { student_uid },
            {
              $set: {
                student_uid,
                basic_info: {
                  name: nameIndex !== -1 ? row[nameIndex] : '',
                  college_name: collegeName,
                },
                assessment,
                'progress.assessment_completed': true,
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
      } catch (error: any) {
        console.error(`Error processing ${collegeName} (sheet_id: ${sheetId}):`, error.message)
        // Continue with next college instead of failing entire sync
        skippedRows++
        continue
      }
    }

    return NextResponse.json({
      status: 'ok',
      upsertedCount,
      skippedRows,
      notInTr2Count,
      totalValidStudents: validStudentUids.size,
    })
  } catch (error: any) {
    console.error('Assessment sync failed:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
