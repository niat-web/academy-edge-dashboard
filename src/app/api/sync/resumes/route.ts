import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

/**
 * Sync Candidate Resumes from Google Sheets
 * Only syncs for students who exist in TR2
 */
export async function POST() {
    try {
        const sheets = getSheetsClient()

        const sheetId = process.env.RESUME_SHEET_ID?.trim()
        const sheetName = process.env.RESUME_SHEET_NAME?.trim()

        if (!sheetId || !sheetName) {
            return NextResponse.json({
                status: 'error',
                message: 'RESUME_SHEET_ID or RESUME_SHEET_NAME not configured in environment',
            }, { status: 400 })
        }

        // First, get the spreadsheet metadata to verify sheet name
        let targetSheetName = sheetName
        try {
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
            })
            const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]
            console.log(`[RESUME SYNC] Available sheets in spreadsheet: ${sheetTitles.join(', ')}`)

            // Try to find exact match first, then case-insensitive, then trimmed match
            if (!sheetTitles.includes(sheetName)) {
                // Try case-insensitive match
                let matched = sheetTitles.find(t => t.toLowerCase() === sheetName.toLowerCase())

                // Try trimmed match (handles trailing spaces in sheet names)
                if (!matched) {
                    matched = sheetTitles.find(t => t.trim().toLowerCase() === sheetName.trim().toLowerCase())
                }

                if (matched) {
                    console.log(`[RESUME SYNC] Using matched sheet: "${matched}" for requested "${sheetName}"`)
                    targetSheetName = matched
                } else {
                    return NextResponse.json({
                        status: 'error',
                        message: `Sheet "${sheetName}" not found. Available sheets: ${sheetTitles.join(', ')}`,
                    }, { status: 400 })
                }
            }
        } catch (metaError: any) {
            console.warn('[RESUME SYNC] Could not fetch spreadsheet metadata:', metaError.message)
        }

        // Fetch resume sheet (wrap in quotes if contains spaces)
        const range = targetSheetName.includes(' ') ? `'${targetSheetName}'` : targetSheetName
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        })

        const rows = response.data.values || []

        if (rows.length < 2) {
            return NextResponse.json({
                status: 'ok',
                upsertedCount: 0,
                skippedRows: 0,
                message: 'No resume data found',
            })
        }

        // Dynamically detect header row
        const normalize = (s: any) => (s || '').toString().trim().toLowerCase()
        const UID_CANDIDATES = ['candidate uid', 'student uid', 'uid', 'uids']
        const RESUME_CANDIDATES = ['candidate resume', 'resume', 'resume link', 'resume url']

        let HEADER_ROW_INDEX = -1

        for (let r = 0; r < Math.min(rows.length, 10); r++) {
            const row = rows[r]
            if (row.some((cell: any) => UID_CANDIDATES.includes(normalize(cell)))) {
                HEADER_ROW_INDEX = r
                break
            }
        }

        if (HEADER_ROW_INDEX === -1) {
            HEADER_ROW_INDEX = 0 // Fallback to first row
            console.warn('Could not detect header row dynamically for resumes, falling back to index 0')
        }

        const DATA_START_INDEX = HEADER_ROW_INDEX + 1
        const headers = rows[HEADER_ROW_INDEX]

        // Find column indices
        const findColIndex = (candidates: string[]) => {
            return headers.findIndex((h: string) => candidates.includes(normalize(h)))
        }

        const uidIndex = findColIndex(UID_CANDIDATES)
        const resumeIndex = findColIndex(RESUME_CANDIDATES)

        if (uidIndex === -1) {
            console.error('Available headers:', headers)
            throw new Error('Candidate UID column not found in resume sheet')
        }

        if (resumeIndex === -1) {
            console.error('Available headers:', headers)
            throw new Error('Candidate Resume column not found in resume sheet')
        }

        // MongoDB connection
        const client = await clientPromise
        const db = client.db('student_dashboard')

        // Get all TR2 student UIDs for filtering
        const tr2Students = await db.collection('students-tr2')
            .find({}, { projection: { student_uid: 1 } })
            .toArray()

        const tr2UidSet = new Set(tr2Students.map((s: any) => s.student_uid))

        let upsertedCount = 0
        let skippedRows = 0
        const bulkOps = []

        // Process each row
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

            // Only sync if student exists in TR2
            if (!tr2UidSet.has(student_uid)) {
                skippedRows++
                continue
            }

            const resumeLink = row[resumeIndex]?.trim() || ''

            bulkOps.push({
                updateOne: {
                    filter: { student_uid },
                    update: {
                        $set: {
                            student_uid,
                            candidate_resume: resumeLink,
                            'timestamps.updated_at': new Date(),
                        },
                        $setOnInsert: {
                            'timestamps.created_at': new Date(),
                        },
                    },
                    upsert: true
                }
            })

            upsertedCount++
        }

        // Execute bulk write
        if (bulkOps.length > 0) {
            await db.collection('students-resumes').bulkWrite(bulkOps)
        }

        return NextResponse.json({
            status: 'ok',
            upsertedCount,
            skippedRows,
        })
    } catch (error: any) {
        console.error('Resume sync failed:', error)
        return NextResponse.json(
            {
                status: 'error',
                message: error.message || 'Resume sync failed',
            },
            { status: 500 }
        )
    }
}
