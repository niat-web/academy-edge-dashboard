import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import clientPromise from '@/lib/mongodb'

type FlatRow = Record<string, string | number | boolean>

function normalizeKeySegment(segment: string): string {
  return segment.replace(/\s+/g, ' ').trim()
}

function omitStudentUid<T extends Record<string, unknown> | null | undefined>(doc: T) {
  if (!doc) return null

  const rest = { ...doc }
  delete rest.student_uid
  return rest
}

function formatCellValue(value: unknown): string | number | boolean {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return value
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function flattenRecord(
  value: unknown,
  prefix = '',
  output: FlatRow = {}
): FlatRow {
  if (value === null || value === undefined) {
    return output
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPrefix = `${prefix}[${index + 1}]`
      flattenRecord(item, nextPrefix, output)
    })
    return output
  }

  if (value instanceof Date) {
    output[prefix] = value.toISOString()
    return output
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([rawKey, nestedValue]) => {
      if (nestedValue === undefined) {
        return
      }

      const sanitizedKey = normalizeKeySegment(rawKey)
      const nextPrefix = prefix ? `${prefix}.${sanitizedKey}` : sanitizedKey
      flattenRecord(nestedValue, nextPrefix, output)
    })

    return output
  }

  if (prefix) {
    output[prefix] = formatCellValue(value)
  }

  return output
}

function getOrderedColumns(rows: FlatRow[]) {
  const preferredColumns = [
    'student_uid',
    'profile_url',
    'students_tr2.basic_info.name',
    'students_tr2.basic_info.university',
    'students_assessment.basic_info.name',
    'students_assessment.basic_info.college_name',
    'students_assessment.assessment.scores.student_assessment_score',
    'students_tr1.tr1.total_score',
    'students_tr2.tr2.overall_score',
    'students_resumes.candidate_resume',
    'final_verdicts.recommendation',
  ]

  const allColumns = new Set<string>()
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => allColumns.add(key))
  })

  const preferred = preferredColumns.filter((column) => allColumns.has(column))
  const remaining = [...allColumns].filter((column) => !preferred.includes(column))

  const prefixOrder = [
    'students_tr2.',
    'students_assessment.',
    'students_tr1.',
    'students_resumes.',
    'final_verdicts.',
  ]

  remaining.sort((left, right) => {
    const leftGroup = prefixOrder.findIndex((prefix) => left.startsWith(prefix))
    const rightGroup = prefixOrder.findIndex((prefix) => right.startsWith(prefix))

    const leftRank = leftGroup === -1 ? prefixOrder.length : leftGroup
    const rightRank = rightGroup === -1 ? prefixOrder.length : rightGroup

    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return left.localeCompare(right)
  })

  return [...preferred, ...remaining]
}

function getColumnWidth(key: string, rows: FlatRow[]) {
  if (/url|link|resume/i.test(key)) {
    return 48
  }

  const sampleLengths = rows.slice(0, 50).map((row) => {
    const value = row[key]
    return value === undefined || value === null ? 0 : String(value).length
  })

  const maxLength = Math.max(key.length, ...sampleLengths)
  return Math.min(Math.max(maxLength + 2, 16), 40)
}

export async function GET(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db('student_dashboard')
    const requestUrl = new URL(request.url)

    const [tr2Students, assessmentStudents, tr1Students, resumeStudents, verdictStudents] = await Promise.all([
      db
        .collection('students-tr2')
        .find({}, { projection: { _id: 0 } })
        .sort({ 'timestamps.updated_at': -1 })
        .toArray(),
      db.collection('students').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('students-tr1').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('students-resumes').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('final_verdicts').find({}, { projection: { _id: 0 } }).toArray(),
    ])

    const assessmentByUid = new Map(
      assessmentStudents.map((student) => [student.student_uid, student])
    )
    const tr1ByUid = new Map(
      tr1Students.map((student) => [student.student_uid, student])
    )
    const resumeByUid = new Map(
      resumeStudents.map((student) => [student.student_uid, student])
    )
    const verdictByUid = new Map(
      verdictStudents.map((student) => [student.student_uid, student])
    )

    const orderedUids = tr2Students.map((student) => student.student_uid)
    const additionalUids = new Set<string>()

    ;[assessmentStudents, tr1Students, resumeStudents, verdictStudents].forEach((collectionDocs) => {
      collectionDocs.forEach((student) => {
        if (!orderedUids.includes(student.student_uid)) {
          additionalUids.add(student.student_uid)
        }
      })
    })

    const allUids = [
      ...orderedUids,
      ...[...additionalUids].sort((left, right) => left.localeCompare(right)),
    ]

    const tr2ByUid = new Map(
      tr2Students.map((student) => [student.student_uid, student])
    )

    const rows = allUids.map((studentUid) => {
      const profileUrl = new URL(`/students/${studentUid}`, requestUrl.origin).toString()
      const exportRecord = {
        student_uid: studentUid,
        profile_url: profileUrl,
        students_tr2: omitStudentUid(tr2ByUid.get(studentUid)),
        students_assessment: omitStudentUid(assessmentByUid.get(studentUid)),
        students_tr1: omitStudentUid(tr1ByUid.get(studentUid)),
        students_resumes: omitStudentUid(resumeByUid.get(studentUid)),
        final_verdicts: omitStudentUid(verdictByUid.get(studentUid)),
      }

      return flattenRecord(exportRecord)
    })

    const orderedColumns = getOrderedColumns(rows)

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Full Candidate Export')

    worksheet.columns = orderedColumns.map((columnKey) => ({
      header: columnKey,
      key: columnKey,
      width: getColumnWidth(columnKey, rows),
    }))

    rows.forEach((row) => {
      worksheet.addRow(row)
    })

    worksheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }]
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: orderedColumns.length },
    }

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const date = new Date().toISOString().split('T')[0]
    const filename = `students-full-export-${date}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export full candidate data'
    console.error('Error exporting full candidate data:', error)

    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    )
  }
}
