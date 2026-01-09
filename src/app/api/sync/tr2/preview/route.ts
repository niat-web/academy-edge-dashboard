import { NextResponse } from 'next/server'
import { getSheetsClient } from '@/lib/googlesheets'

export async function GET() {
  try {
    const sheets = await getSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.TR2_SHEET_ID,
      range: process.env.TR2_SHEET_NAME,
    })

    const rows = response.data.values || []

    return NextResponse.json({
      status: 'ok',
      totalRows: rows.length,
      preview: rows.slice(0, 5),
    })
  } catch (error) {
    console.error('TR2 preview failed:', error)
    return NextResponse.json(
      { error: 'Failed to read TR2 sheet' },
      { status: 500 }
    )
  }
}
