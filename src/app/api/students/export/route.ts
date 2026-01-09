import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import ExcelJS from 'exceljs'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const collegeName = searchParams.get('college') || ''
        const evaluationType = searchParams.get('evaluation') || ''
        const interviewType = searchParams.get('interview') || ''
        const verdictType = searchParams.get('verdict') || ''

        const client = await clientPromise
        const db = client.db('student_dashboard')

        // Build match stage for MongoDB aggregation
        const matchStage: any = {}

        // Search by name or UID
        if (search) {
            matchStage.$or = [
                { 'basic_info.name': { $regex: search, $options: 'i' } },
                { student_uid: { $regex: search, $options: 'i' } },
            ]
        }

        // Filter by college name
        if (collegeName) {
            const collegeCondition = {
                $or: [
                    { 'basic_info.university': { $regex: collegeName, $options: 'i' } },
                    { 'basic_info.college_name': { $regex: collegeName, $options: 'i' } },
                ]
            }

            if (matchStage.$or) {
                matchStage.$and = [
                    { $or: matchStage.$or },
                    collegeCondition
                ]
                delete matchStage.$or
            } else {
                matchStage.$or = collegeCondition.$or
            }
        }

        // Build aggregation pipeline
        const pipeline: any[] = [
            { $match: matchStage },
        ]

        // Add lookups to get related data
        pipeline.push(
            // Lookup assessment data
            {
                $lookup: {
                    from: 'students',
                    localField: 'student_uid',
                    foreignField: 'student_uid',
                    as: 'assessment_data'
                }
            },
            {
                $unwind: {
                    path: '$assessment_data',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Lookup TR1 data
            {
                $lookup: {
                    from: 'students-tr1',
                    localField: 'student_uid',
                    foreignField: 'student_uid',
                    as: 'tr1_data'
                }
            },
            // Lookup TR2 data
            {
                $lookup: {
                    from: 'students-tr2',
                    localField: 'student_uid',
                    foreignField: 'student_uid',
                    as: 'tr2_data_filter'
                }
            },
            // Lookup verdict data
            {
                $lookup: {
                    from: 'final_verdicts',
                    localField: 'student_uid',
                    foreignField: 'student_uid',
                    as: 'verdict_data'
                }
            }
        )

        // Add evaluation filter to pipeline if specified
        if (evaluationType) {
            const evaluationFieldMap: Record<string, string> = {
                'coding': 'assessment.scores.coding_student_score',
                'dsa': 'assessment.scores.dsa_student_score',
                'cs fundamentals': 'assessment.scores.cs_fundamentals_student_score',
                'quantitative': 'assessment.scores.quantitative_student_score',
                'logical': 'assessment.scores.logical_student_score',
                'verbal': 'assessment.scores.verbal_student_score',
            }

            const fieldPath = evaluationFieldMap[evaluationType.toLowerCase()]
            if (fieldPath) {
                pipeline.push({
                    $match: {
                        'assessment_data': { $exists: true },
                        [`assessment_data.${fieldPath}`]: { $exists: true, $nin: [null, ''] }
                    }
                })
            }
        }

        // Add interview filter to pipeline if specified
        if (interviewType) {
            if (interviewType === 'tr1') {
                pipeline.push({
                    $match: {
                        'tr1_data.0': { $exists: true }
                    }
                })
            } else if (interviewType === 'tr2') {
                pipeline.push({
                    $match: {
                        'tr2_data_filter.0': { $exists: true }
                    }
                })
            }
        }

        // Add verdict filter to pipeline if specified
        if (verdictType) {
            pipeline.push({
                $match: {
                    'verdict_data.0.recommendation': verdictType
                }
            })
        }

        // Add sort
        pipeline.push({ $sort: { 'timestamps.updated_at': -1 } })

        // Add projection
        pipeline.push({
            $project: {
                student_uid: 1,
                'basic_info.name': 1,
                'basic_info.university': 1,
                'basic_info.college_name': 1,
                assessment: '$assessment_data', // Already unwound
                tr1: { $arrayElemAt: ['$tr1_data', 0] },
                tr2: { $arrayElemAt: ['$tr2_data_filter', 0] },
                verdict: { $arrayElemAt: ['$verdict_data', 0] }
            }
        })

        // Fetch all matching students
        const allStudents = await db.collection('students-tr2').aggregate(pipeline).toArray()

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Students')

        // Define columns based on active filters (matching UI behavior)
        const columns: any[] = [
            { header: 'Student UID', key: 'student_uid', width: 20 },
            { header: 'Name', key: 'name', width: 25 },
        ]

        // If evaluation filter is active, only show that evaluation score
        if (evaluationType) {
            const evaluationLabel = evaluationType.charAt(0).toUpperCase() + evaluationType.slice(1)
            columns.push({ header: `${evaluationLabel} Score`, key: 'evaluation_score', width: 18 })
        }
        // If interview filter is active, only show that interview score
        else if (interviewType) {
            columns.push({ header: `${interviewType.toUpperCase()} Score`, key: 'interview_score', width: 15 })
        }
        // If verdict filter is active, only show final verdict
        else if (verdictType) {
            columns.push({ header: 'Final Verdict', key: 'final_verdict', width: 18 })
        }
        // If no evaluation, interview, or verdict filter, show all default columns
        else {
            columns.push(
                { header: 'University/College', key: 'college', width: 30 },
                { header: 'Report Link', key: 'report_link', width: 60 },
                { header: 'Assessment Score', key: 'assessment_score', width: 18 },
                { header: 'TR1 Score', key: 'tr1_score', width: 12 },
                { header: 'TR2 Score', key: 'tr2_score', width: 12 },
                { header: 'Final Verdict', key: 'final_verdict', width: 18 }
            )
        }

        worksheet.columns = columns

        // Style header row
        worksheet.getRow(1).font = { bold: true }
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        }

        // Add data rows based on active filters
        allStudents.forEach((student: any) => {
            const assessment = student.assessment?.assessment?.scores
            const rowData: any = {
                student_uid: student.student_uid,
                name: student.basic_info?.name || 'N/A',
            }

            // Add data based on which filter is active
            if (evaluationType) {
                // Only add the selected evaluation score
                const evaluationFieldMap: Record<string, string> = {
                    'coding': 'coding_student_score',
                    'dsa': 'dsa_student_score',
                    'cs fundamentals': 'cs_fundamentals_student_score',
                    'quantitative': 'quantitative_student_score',
                    'logical': 'logical_student_score',
                    'verbal': 'verbal_student_score',
                }
                const fieldKey = evaluationFieldMap[evaluationType.toLowerCase()]
                rowData.evaluation_score = assessment?.[fieldKey] || 'N/A'
            }
            else if (interviewType) {
                // Only add the selected interview score
                if (interviewType === 'tr1') {
                    rowData.interview_score = student.tr1?.tr1?.total_score || 'N/A'
                } else if (interviewType === 'tr2') {
                    rowData.interview_score = student.tr2?.tr2?.overall_score || 'N/A'
                }
            }
            else if (verdictType) {
                // Only add the final verdict
                rowData.final_verdict = student.verdict?.recommendation || 'N/A'
            }
            else {
                // Add all default columns
                const profileUrl = `https://academy-edge-dashboard.vercel.app/students/${student.student_uid}`
                rowData.college = student.basic_info?.university || student.basic_info?.college_name || 'N/A'
                rowData.report_link = profileUrl
                rowData.assessment_score = assessment?.student_assessment_score || 'N/A'
                rowData.tr1_score = student.tr1?.tr1?.total_score || 'N/A'
                rowData.tr2_score = student.tr2?.tr2?.overall_score || 'N/A'
                rowData.final_verdict = student.verdict?.recommendation || 'N/A'
            }

            worksheet.addRow(rowData)
        })

        // Generate Excel file buffer
        const buffer = await workbook.xlsx.writeBuffer()

        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0]
        const filename = `students-export-${date}.xlsx`

        // Return Excel file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error('Error exporting students:', error)
        return NextResponse.json(
            { status: 'error', message: error.message },
            { status: 500 }
        )
    }
}
