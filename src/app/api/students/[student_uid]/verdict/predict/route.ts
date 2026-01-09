import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(
  request: Request,
  context: { params: Promise<{ student_uid: string }> }
) {
  try {
    const { student_uid } = await context.params

    const client = await clientPromise
    const db = client.db('student_dashboard')

    // Fetch all student data
    const [tr2Student, tr1Student, assessmentStudent] = await Promise.all([
      db.collection('students-tr2').findOne({ student_uid }),
      db.collection('students-tr1').findOne({ student_uid }),
      db.collection('students').findOne({ student_uid }),
    ])

    if (!tr2Student) {
      return NextResponse.json(
        { status: 'error', message: 'Student not found' },
        { status: 404 }
      )
    }

    // Extract key metrics for AI analysis
    const assessmentScores = assessmentStudent?.assessment?.scores || {}
    const tr1Data = tr1Student?.tr1 || {}
    const tr2Data = tr2Student?.tr2 || {}

    // Calculate overall scores
    const assessmentScore = parseFloat(assessmentScores.student_assessment_score) || 0
    const tr1TotalScore = parseFloat(tr1Data.total_score) || 0
    const tr2OverallScore = parseFloat(tr2Data.overall_score) || 0

    // Extract detailed metrics
    const codingScore = parseFloat(assessmentScores.coding_student_score) || 0
    const dsaScore = parseFloat(assessmentScores.dsa_student_score) || 0
    const csFundamentalsScore = parseFloat(assessmentScores.cs_fundamentals_student_score) || 0

    // TR1 metrics
    const tr1Problem1Solving = parseFloat(tr1Data.problem_1?.problem_solving_rating) || 0
    const tr1Problem1Code = parseFloat(tr1Data.problem_1?.code_implementation_rating) || 0
    const tr1Problem2Solving = parseFloat(tr1Data.problem_2?.problem_solving_rating) || 0
    const tr1Problem2Code = parseFloat(tr1Data.problem_2?.code_implementation_rating) || 0
    const tr1Communication = parseFloat(tr1Data.communication) || 0
    const tr1DsaTheory = parseFloat(tr1Data.dsa_theory) || 0
    const tr1CoreCsTheory = parseFloat(tr1Data.core_cs_theory) || 0

    // TR2 metrics
    const tr2FrontendScore = parseFloat(tr2Data.frontend?.frontend_score) || 0
    const tr2BackendScore = parseFloat(tr2Data.backend?.backend_score) || 0
    const tr2InternshipScore = parseFloat(tr2Data.experience?.internship_score) || 0
    const tr2Presentability = parseFloat(tr2Data.soft_skills?.presentability) || 0
    const tr2Communication = parseFloat(tr2Data.soft_skills?.communication) || 0
    const tr2ProjectRating = parseFloat(tr2Data.projects?.project_rating) || 0

    // AI-based decision logic
    let decision = 'Hold'
    let decisionReason = ''

    // Calculate weighted scores
    const avgProblemSolving = (tr1Problem1Solving + tr1Problem2Solving) / 2
    const avgCodeImplementation = (tr1Problem1Code + tr1Problem2Code) / 2
    const avgTechnicalScore = (tr1TotalScore + tr2OverallScore) / 2
    const avgSoftSkills = (tr1Communication + tr2Communication + tr2Presentability) / 3

    // Decision criteria
    const hasStrongAssessment = assessmentScore >= 70
    const hasStrongTR1 = tr1TotalScore >= 70 && avgProblemSolving >= 4 && avgCodeImplementation >= 4
    const hasStrongTR2 = tr2OverallScore >= 70 && tr2FrontendScore >= 60 && tr2BackendScore >= 60
    const hasGoodSoftSkills = avgSoftSkills >= 4
    const hasGoodTheory = (tr1DsaTheory + tr1CoreCsTheory) / 2 >= 6

    // Decision logic
    if (hasStrongAssessment && hasStrongTR1 && hasStrongTR2 && hasGoodSoftSkills) {
      decision = 'Accepted'
      decisionReason = 'Strong performance across all assessments with excellent technical skills, problem-solving ability, and communication.'
    } else if (hasStrongAssessment && hasStrongTR1 && hasGoodSoftSkills) {
      decision = 'Accepted'
      decisionReason = 'Strong assessment and TR1 performance with good communication skills. TR2 shows potential for growth.'
    } else if (hasStrongAssessment && hasStrongTR2 && hasGoodSoftSkills) {
      decision = 'Accepted'
      decisionReason = 'Strong assessment and TR2 performance with good communication skills. TR1 shows potential for improvement.'
    } else if (assessmentScore < 50 || tr1TotalScore < 50 || tr2OverallScore < 50) {
      decision = 'Rejected'
      decisionReason = 'Below minimum threshold in one or more assessments. Significant gaps in technical skills or performance.'
    } else if (avgSoftSkills < 3 || avgProblemSolving < 3) {
      decision = 'Rejected'
      decisionReason = 'Insufficient problem-solving skills or communication abilities below acceptable standards.'
    } else if (hasStrongAssessment || hasStrongTR1 || hasStrongTR2) {
      decision = 'Hold'
      decisionReason = 'Mixed performance with strengths in some areas but needs improvement in others. Requires further evaluation.'
    } else {
      decision = 'Hold'
      decisionReason = 'Average performance across assessments. Needs improvement in multiple areas before final decision.'
    }

    // Generate detailed comments
    const comments = `Based on comprehensive evaluation:

Assessment Performance: ${assessmentScore}/100
- Coding: ${codingScore}/100
- DSA: ${dsaScore}/100
- CS Fundamentals: ${csFundamentalsScore}/100

TR1 Performance: ${tr1TotalScore}/100
- Problem Solving: ${avgProblemSolving.toFixed(1)}/5
- Code Implementation: ${avgCodeImplementation.toFixed(1)}/5
- Communication: ${tr1Communication}/5
- Theory Knowledge: DSA ${tr1DsaTheory}/10, Core CS ${tr1CoreCsTheory}/10

TR2 Performance: ${tr2OverallScore}/100
- Frontend: ${tr2FrontendScore}/100
- Backend: ${tr2BackendScore}/100
- Internship Experience: ${tr2InternshipScore}/100
- Soft Skills: Communication ${tr2Communication}/5, Presentability ${tr2Presentability}/5

${decisionReason}`

    // Generate internal review
    const internalReview = `Technical Assessment Summary:
- Overall Assessment Score: ${assessmentScore}/100
- TR1 Total Score: ${tr1TotalScore}/100
- TR2 Overall Score: ${tr2OverallScore}/100

Strengths:
${assessmentScore >= 70 ? `✓ Strong assessment performance (${assessmentScore}/100)` : ''}
${tr1TotalScore >= 70 ? `✓ Strong TR1 technical skills (${tr1TotalScore}/100)` : ''}
${tr2OverallScore >= 70 ? `✓ Strong TR2 full-stack capabilities (${tr2OverallScore}/100)` : ''}
${avgProblemSolving >= 4 ? `✓ Good problem-solving abilities (${avgProblemSolving.toFixed(1)}/5)` : ''}
${avgSoftSkills >= 4 ? `✓ Strong communication and soft skills (${avgSoftSkills.toFixed(1)}/5)` : ''}

Areas for Improvement:
${assessmentScore < 70 ? `- Assessment score below threshold (${assessmentScore}/100)` : ''}
${tr1TotalScore < 70 ? `- TR1 performance needs improvement (${tr1TotalScore}/100)` : ''}
${tr2OverallScore < 70 ? `- TR2 performance needs improvement (${tr2OverallScore}/100)` : ''}
${avgProblemSolving < 4 ? `- Problem-solving skills need development (${avgProblemSolving.toFixed(1)}/5)` : ''}
${avgSoftSkills < 4 ? `- Communication skills need enhancement (${avgSoftSkills.toFixed(1)}/5)` : ''}

Recommendation: ${decision}`

    // Generate assessment notes
    const assessmentNotes = `Assessment Analysis:
- Student Assessment Score: ${assessmentScore}/100
- Coding Student Score: ${codingScore}/100
- DSA Student Score: ${dsaScore}/100
- CS Fundamentals Score: ${csFundamentalsScore}/100

${assessmentScore >= 80 ? 'Excellent performance across all assessment categories.' : assessmentScore >= 70 ? 'Good performance with room for improvement in some areas.' : assessmentScore >= 60 ? 'Average performance, needs focused improvement.' : 'Below average performance, significant improvement required.'}`

    // Generate TR1 notes
    const tr1Notes = `TR1 Interview Analysis:
- Total Score: ${tr1TotalScore}/100
- Problem 1: Solving ${tr1Problem1Solving}/5, Implementation ${tr1Problem1Code}/5
- Problem 2: Solving ${tr1Problem2Solving}/5, Implementation ${tr1Problem2Code}/5
- Communication: ${tr1Communication}/5
- Theory: DSA ${tr1DsaTheory}/10, Core CS ${tr1CoreCsTheory}/10

${tr1TotalScore >= 70 ? 'Strong technical interview performance.' : tr1TotalScore >= 60 ? 'Moderate performance with some technical gaps.' : 'Weak performance, significant technical improvement needed.'}`

    // Generate TR2 notes
    const tr2Notes = `TR2 Interview Analysis:
- Overall Score: ${tr2OverallScore}/100
- Frontend Score: ${tr2FrontendScore}/100
- Backend Score: ${tr2BackendScore}/100
- Internship Score: ${tr2InternshipScore}/100
- Project Rating: ${tr2ProjectRating}/100
- Soft Skills: Communication ${tr2Communication}/5, Presentability ${tr2Presentability}/5

${tr2OverallScore >= 70 ? 'Strong full-stack interview performance with good project understanding.' : tr2OverallScore >= 60 ? 'Moderate performance, needs improvement in technical depth.' : 'Weak performance, significant gaps in full-stack knowledge.'}`

    const predictedVerdict = {
      decision,
      comments,
      internal_review: internalReview,
      reviewer_name: 'AI Assistant',
      assessment_notes: assessmentNotes,
      tr1_notes: tr1Notes,
      tr2_notes: tr2Notes,
    }

    return NextResponse.json({
      status: 'ok',
      data: predictedVerdict,
    })
  } catch (error: any) {
    console.error('Error predicting verdict:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}

