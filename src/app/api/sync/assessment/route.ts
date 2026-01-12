import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

const RAW_DATA_TAB_NAME = 'raw data'
const CONCURRENCY_LIMIT = 3 // Reduced from 5 to avoid Rate Limiting

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

    // 4. Get all students from TR2 and check who is missing in the assessment collection
    const tr2Students = await db.collection('students-tr2')
      .find({}, { projection: { student_uid: 1, 'basic_info.university': 1 } })
      .toArray()

    const existingAssessments = await db.collection('students')
      .find({}, { projection: { student_uid: 1 } })
      .toArray()

    const assessmentUidSet = new Set(existingAssessments.map(s => s.student_uid))

    const studentsNeedSync = tr2Students.filter(s => !assessmentUidSet.has(s.student_uid))
    const validStudentUids = new Set(tr2Students.map(s => s.student_uid))

    console.log(`Targeted Sync: ${studentsNeedSync.length}/${tr2Students.length} students missing assessment data`)

    const relevantUnivSet = new Set(
      studentsNeedSync.map(s => (s.basic_info?.university || '').toString().trim().toLowerCase())
    )

    console.log(`Targeting ${relevantUnivSet.size} unique universities for sync`)

    // 5. Fetch and Filter colleges
    const allColleges = await db.collection('college_sheets').find().toArray()
    const colleges = allColleges.filter(c => {
      const name = (c.college_name || '').toString().trim().toLowerCase()
      return relevantUnivSet.has(name)
    })

    console.log(`Filtering colleges: ${allColleges.length} total -> ${colleges.length} relevant to sync`)

    let upsertedCount = 0
    let skippedRows = 0
    let notInTr2Count = 0

    // Helper function to process a single college
    const processCollege = async (college: any) => {
      const sheetId = college.sheet_id
      const collegeName = college.college_name

      if (!sheetId) {
        console.warn(`Skipping ${collegeName}: No sheet_id found`)
        return { skipped: 1, upserted: 0, notInTr2: 0 }
      }

      let localSkipped = 0
      let localUpserted = 0
      let localNotInTr2 = 0

      try {
        // 1. Get spreadsheet metadata to find the correct tab name
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        })

        const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]

        // Find a title that matches "Raw Data" case-insensitively
        let targetTabName = sheetTitles.find(t =>
          t.trim().toLowerCase() === RAW_DATA_TAB_NAME.toLowerCase()
        )

        if (!targetTabName) {
          // Fallback to exactly "Raw Data" if specified sheet list is empty or fails
          // Or fall back to the very first sheet if no name matches
          targetTabName = sheetTitles[0] || RAW_DATA_TAB_NAME
          console.warn(`[SYNC] ${collegeName}: Could not find exact "${RAW_DATA_TAB_NAME}" tab. Falling back to "${targetTabName}"`)
        }

        // 2. Fetch data from the identified tab
        const range = `'${targetTabName}'!A:ZZ`
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: range,
        })

        const rows = response.data.values || []
        if (rows.length < 2) {
          console.warn(`Skipping ${collegeName}: Not enough data rows (${rows.length}) in tab "${targetTabName}"`)
          return { skipped: 1, upserted: 0, notInTr2: 0 }
        }

        const headers = rows[0]
        const uidIndex = headers.indexOf('Student ID')
        const nameIndex = headers.indexOf('Candidate Name') !== -1
          ? headers.indexOf('Candidate Name')
          : headers.indexOf('Student Name') !== -1
            ? headers.indexOf('Student Name')
            : headers.indexOf('Name')

        if (uidIndex === -1) {
          console.warn(`Skipping ${collegeName}: Student ID column not found.`)
          return { skipped: 1, upserted: 0, notInTr2: 0 }
        }

        const bulkOps = []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const rawUid = row[uidIndex]

          if (!rawUid) {
            localSkipped++
            continue
          }

          const student_uid = rawUid.trim()
          if (!student_uid) {
            localSkipped++
            continue
          }

          if (!validStudentUids.has(student_uid)) {
            localNotInTr2++
            continue
          }

          const assessment: any = {}

          // Map known fields
          for (const [header, path] of Object.entries(ASSESSMENT_FIELD_MAP)) {
            const colIndex = headers.indexOf(header)
            if (colIndex === -1) continue
            const value = row[colIndex] ?? ''
            if (value !== '') {
              setNestedValue(assessment, path, value)
            }
          }

          // Store raw data
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

          if (Object.keys(rawData).length > 0) {
            assessment.raw_data = rawData
          }

          bulkOps.push({
            updateOne: {
              filter: { student_uid },
              update: {
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
              upsert: true
            }
          })
        }

        if (bulkOps.length > 0) {
          await db.collection('students').bulkWrite(bulkOps)
          localUpserted += bulkOps.length
        }
      } catch (error: any) {
        console.error(`Error processing ${collegeName} (sheet_id: ${sheetId}):`, error.message)
        return { skipped: 1, upserted: 0, notInTr2: 0 }
      }

      return { skipped: localSkipped, upserted: localUpserted, notInTr2: localNotInTr2 }
    }

    // Process in batches
    for (let i = 0; i < colleges.length; i += CONCURRENCY_LIMIT) {
      const batch = colleges.slice(i, i + CONCURRENCY_LIMIT)
      const results = await Promise.all(batch.map(processCollege))

      results.forEach(r => {
        skippedRows += r.skipped
        upsertedCount += r.upserted
        notInTr2Count += r.notInTr2
      })

      console.log(`Processed batch ${Math.ceil((i + 1) / CONCURRENCY_LIMIT)}/${Math.ceil(colleges.length / CONCURRENCY_LIMIT)}`)

      // Add delay to prevent hitting Google Sheets API rate limits (Quota Exceeded)
      if (i + CONCURRENCY_LIMIT < colleges.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
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
