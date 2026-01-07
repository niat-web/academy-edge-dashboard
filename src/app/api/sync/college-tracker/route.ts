import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

function extractSheetId(url: string | null): string | null {
  if (!url) return null
  const parts = url.split('/d/')
  if (parts.length < 2) return null
  return parts[1].split('/')[0]
}

// Recursively search for URLs in an object
function findUrlInObject(obj: any, visited = new Set()): string | null {
  if (!obj || typeof obj !== 'object') return null
  if (visited.has(obj)) return null
  visited.add(obj)

  // Check if this is a string that looks like a URL
  if (typeof obj === 'string' && obj.startsWith('http')) {
    return obj
  }

  // Check common hyperlink properties
  if (obj.hyperlink && typeof obj.hyperlink === 'string') {
    return obj.hyperlink
  }
  if (obj.uri && typeof obj.uri === 'string' && obj.uri.startsWith('http')) {
    return obj.uri
  }
  if (obj.url && typeof obj.url === 'string' && obj.url.startsWith('http')) {
    return obj.url
  }
  if (obj.link && typeof obj.link === 'string' && obj.link.startsWith('http')) {
    return obj.link
  }
  if (obj.address && typeof obj.address === 'string' && obj.address.startsWith('http')) {
    return obj.address
  }

  // Recursively search through all properties
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findUrlInObject(obj[key], visited)
      if (result) return result
    }
  }

  return null
}

export async function POST() {
  try {
    const sheets = getSheetsClient()

    // Use MASTER_TRACKER_SHEET_ID from .env.local
    const spreadsheetId = process.env.MASTER_TRACKER_SHEET_ID
    if (!spreadsheetId) {
      throw new Error('MASTER_TRACKER_SHEET_ID is not set in .env.local')
    }

    // 🔑 IMPORTANT: use spreadsheets.get with includeGridData to get hyperlinks
    // Try without fields restriction first to see all available data
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: true,
    })

    // Also try to get formulas in case hyperlinks are stored as HYPERLINK formulas
    const sheetName = process.env.MASTER_TRACKER_SHEET_NAME || response.data.sheets?.[0]?.properties?.title
    let formulasResponse: any = null
    if (sheetName) {
      try {
        formulasResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
          valueRenderOption: 'FORMULA',
        })
      } catch (err) {
        console.warn('Could not fetch formulas:', err)
      }
    }

    // Get the sheet by name from env or use first sheet
    const actualSheetName = process.env.MASTER_TRACKER_SHEET_NAME
    const sheet = actualSheetName
      ? response.data.sheets?.find(s => s.properties?.title === actualSheetName)
      : response.data.sheets?.[0]

    if (!sheet || !sheet.data?.[0]?.rowData) {
      throw new Error('College Tracker sheet data not found')
    }

    const rows = sheet.data[0].rowData

    // Find header row dynamically
    const headerRowIndex = rows.findIndex(row =>
      row.values?.some(c => c.formattedValue === 'Name of the college')
    )

    if (headerRowIndex === -1) {
      throw new Error('Header row not found')
    }

    const headers =
      rows[headerRowIndex].values?.map(c => c.formattedValue || '') || []

    const collegeIndex = headers.indexOf('Name of the college')
    const sheetIndex = headers.indexOf('Master College Sheet')

    if (collegeIndex === -1 || sheetIndex === -1) {
      throw new Error('Required columns missing. Found columns: ' + headers.join(', '))
    }

    const client = await clientPromise
    const db = client.db('student_dashboard')

    let upsertedCount = 0
    let skippedRows = 0

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const cells = rows[i].values || []

      // Get college name
      const college = cells[collegeIndex]?.formattedValue?.trim() || 
                     cells[collegeIndex]?.effectiveValue?.stringValue?.trim() ||
                     cells[collegeIndex]?.userEnteredValue?.stringValue?.trim() ||
                     ''
      
      if (!college) {
        skippedRows++
        continue
      }

      // Get hyperlink from Master College Sheet column
      const linkCell = cells[sheetIndex]
      let link: string | null = null

      if (!linkCell) {
        skippedRows++
        continue
      }

      // Extract hyperlink - try all possible locations
      link = linkCell.hyperlink || null

      // Check textFormatRuns for links
      if (!link && linkCell.textFormatRuns && linkCell.textFormatRuns.length > 0) {
        for (const run of linkCell.textFormatRuns) {
          if (run.format?.link?.uri) {
            link = run.format.link.uri
            break
          }
        }
      }

      // Check for HYPERLINK formula
      if (!link) {
        const formula = linkCell.userEnteredValue?.formulaValue || 
                       linkCell.effectiveValue?.formulaValue ||
                       null
        if (formula && formula.includes('HYPERLINK')) {
          const match = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"\s*[,)]/i)
          if (match?.[1]) {
            link = match[1]
          }
        }
      }

      // Check formulas from separate API call
      if (!link && formulasResponse?.data?.values) {
        const formulaRowIndex = i + 1
        if (formulaRowIndex < formulasResponse.data.values.length) {
          const formulaRow = formulasResponse.data.values[formulaRowIndex]
          if (formulaRow?.[sheetIndex]?.includes('HYPERLINK')) {
            const match = formulaRow[sheetIndex].match(/HYPERLINK\s*\(\s*"([^"]+)"\s*[,)]/i)
            if (match?.[1]) {
              link = match[1]
            }
          }
        }
      }

      // Recursive search as last resort
      if (!link) {
        link = findUrlInObject(linkCell)
      }

      // Extract sheet ID from link
      const sheetId = extractSheetId(link)

      if (!sheetId) {
        console.log(`Skipping row ${i + 1}: College="${college}", Link="${link}"`)
        skippedRows++
        continue
      }

      // Store in MongoDB
      await db.collection('college_sheets').updateOne(
        { college_name: college },
        {
          $set: {
            college_name: college,
            sheet_id: sheetId,
            sheet_name: 'Assessment',
            updated_at: new Date(),
          },
        },
        { upsert: true }
      )

      console.log(`✓ Row ${i + 1}: College="${college}", Sheet ID="${sheetId}"`)
      upsertedCount++
    }

    return NextResponse.json({
      status: 'ok',
      upsertedCount,
      skippedRows,
    })
  } catch (error: any) {
    console.error('College sheets sync failed:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
