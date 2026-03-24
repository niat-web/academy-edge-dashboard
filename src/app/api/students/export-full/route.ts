import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import clientPromise from '@/lib/mongodb'

type FlatRow = Record<string, string | number | boolean>

const RAW_DATA_ALIASES: Record<string, string> = {
  'audit team selection status': 'Audit Team Selection Status',
  'coding section duration in mins': 'Coding Section Duration (in Mins)',
  'coding time spent in mins': 'Coding Time Spent (in Mins)',
  'coding user score': 'Coding User Score',
  'college name': 'College Name',
  'contact no': 'Contact Number',
  'contact number': 'Contact Number',
  'contatct no': 'Contact Number',
  'cs fundamentals section duration in mins': 'CS Fundamentals Section Duration (in Mins)',
  'cs fundamentals time spent in mins': 'CS Fundamentals Time Spent (in Mins)',
  'date of assessment': 'Date of Assessment',
  'dsa section duration in mins': 'DSA Section Duration (in Mins)',
  'dsa time spent in mins': 'DSA Time Spent (in Mins)',
  email: 'Email',
  'logical reasoning section duration in mins': 'Logical Reasoning Section Duration (in Mins)',
  'logical reasoning time spent in mins': 'Logical Reasoning Time Spent (in Mins)',
  name: 'Name',
  'quantitative aptitude section duration in mins': 'Quantitative Aptitude Section Duration (in Mins)',
  'quantitative aptitude time spent in mins': 'Quantitative Aptitude Time Spent (in Mins)',
  'report links': 'Report Links',
  'score criteria selection status': 'Score Criteria Selection Status',
  'verbal ability section duration in mins': 'Verbal Ability Section Duration (in Mins)',
  'verbal ability time spent in mins': 'Verbal Ability Time Spent (in Mins)',
}

const SEGMENT_LABELS: Record<string, string> = {
  student_uid: 'Student UID',
  profile_url: 'Profile URL',
  students_tr2: 'TR2',
  students_assessment: 'Assessment',
  students_tr1: 'TR1',
  students_resumes: 'Resume',
  final_verdicts: 'Final Verdict',
  basic_info: 'Basic Info',
  raw_data: 'Raw Data',
  timestamps: 'Timestamps',
  progress: 'Progress',
  candidate_resume: 'Candidate Resume',
}

const WORD_LABELS: Record<string, string> = {
  ai: 'AI',
  cs: 'CS',
  dsa: 'DSA',
  id: 'ID',
  mcq: 'MCQ',
  mongodb: 'MongoDB',
  tr1: 'TR1',
  tr2: 'TR2',
  uid: 'UID',
  url: 'URL',
}

function normalizeForLookup(segment: string): string {
  return segment
    .replace(/[()[\].]/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function toReadableText(segment: string): string {
  const compact = segment
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!compact) {
    return segment
  }

  return compact
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase()
      if (WORD_LABELS[lower]) {
        return WORD_LABELS[lower]
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function normalizeKeySegment(segment: string, prefix: string): string {
  const collapsed = segment.replace(/\s+/g, ' ').trim()

  if (prefix.endsWith('raw_data')) {
    const alias = RAW_DATA_ALIASES[normalizeForLookup(collapsed)]
    if (alias) {
      return alias
    }

    return toReadableText(collapsed)
  }

  return collapsed
}

function formatColumnHeader(key: string): string {
  const parts = key.split('.').map((segment) => {
    const match = segment.match(/^(.*?)(?:\[(\d+)\])?$/)
    const baseSegment = match?.[1] || segment
    const arrayIndex = match?.[2]

    const baseLabel = SEGMENT_LABELS[baseSegment] || toReadableText(baseSegment)
    return arrayIndex ? `${baseLabel} ${arrayIndex}` : baseLabel
  })

  const dedupedParts = parts.filter((part, index) => part && part !== parts[index - 1])
  return dedupedParts.join(' - ')
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

      const sanitizedKey = normalizeKeySegment(rawKey, prefix)
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
      header: formatColumnHeader(columnKey),
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
