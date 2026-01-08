'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ScoreCard from '@/components/ScoreCard'
import ProgressIndicator from '@/components/ProgressIndicator'
import Accordion from '@/components/Accordion'

interface StudentData {
  student_uid: string
  basic_info: {
    name: string
    university?: string
    college_name?: string
  }
  tr2: any
  tr1: any
  assessment: any
  progress: {
    information: boolean
    assessment: boolean
    tr1: boolean
    tr2: boolean
    completed: boolean
    percentage: number
    completedCount: number
  }
  timestamps?: {
    created_at?: string | Date
  }
}

interface Verdict {
  summary?: string
  strengths?: string[]
  improvements?: string[]
  recommendation?: 'Strong Hire' | 'Hire' | 'Weak Hire'
  generated_at?: Date | string
  model?: string
  // Legacy fields for backward compatibility
  decision?: string
  comments?: string
  internal_review?: string
  reviewer_name?: string
  assessment_notes?: string
  tr1_notes?: string
  tr2_notes?: string
}

export default function StudentProfile() {
  const router = useRouter()
  const params = useParams()
  const student_uid = params.student_uid as string

  const [student, setStudent] = useState<StudentData | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overall' | 'tr1' | 'tr2' | 'verdict'>('overall')

  useEffect(() => {
    fetchStudentData()
    fetchVerdict()
  }, [student_uid])

  const fetchStudentData = async () => {
    try {
      const response = await fetch(`/api/students/${student_uid}`)
      const data = await response.json()
      if (data.status === 'ok') {
        setStudent(data.data)
      }
    } catch (error) {
      console.error('Error fetching student:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVerdict = async () => {
    try {
      const response = await fetch(`/api/students/${student_uid}/verdict`)
      const data = await response.json()
      if (data.status === 'ok') {
        if (data.data) {
          setVerdict(data.data)
        } else {
          // No verdict exists, automatically generate it
          await generateVerdict()
        }
      } else {
        setVerdict(null)
      }
    } catch (error) {
      console.error('Error fetching verdict:', error)
      setVerdict(null)
    }
  }

  const generateVerdict = async () => {
    try {
      const response = await fetch(`/api/students/${student_uid}/verdict/generate`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.status === 'ok' && data.data) {
        setVerdict(data.data)
      } else {
        // If generation failed, try fetching again after a short delay
        setTimeout(() => {
          fetchVerdict()
        }, 2000)
      }
    } catch (error) {
      console.error('Error generating verdict:', error)
      // Retry fetching after error
      setTimeout(() => {
        fetchVerdict()
      }, 2000)
    }
  }

  // Auto-fetch verdict when verdict tab is opened
  useEffect(() => {
    if (activeTab === 'verdict' && student && !loading) {
      fetchVerdict()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, student_uid])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-6 text-gray-600">Loading student profile...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg p-12 border border-gray-200 shadow-sm">
          <p className="text-gray-600 mb-6">Student not found</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const collegeName = student.basic_info?.university || student.basic_info?.college_name || 'N/A'
  
  // Prepare assessment scores for visualization

  // Determine current step for progress bar
  const getCurrentStep = () => {
    if (verdict) return 5 // Final Verdict
    if (student.progress.tr2) return 4 // TR2
    if (student.progress.tr1) return 3 // TR1
    if (student.progress.assessment) return 2 // Assessment
    return 1 // Info
  }

  const currentStep = getCurrentStep()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky Header Section - Student Name + Progress Bar + Tab Buttons */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          {/* Student Name + Progress Bar Card */}
          <div className="mb-4">
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {student.basic_info?.name ? student.basic_info.name.charAt(0).toUpperCase() + student.basic_info.name.slice(1) : 'N/A'}
                </h2>
                <div className="flex items-center justify-center gap-2 text-gray-600 text-sm mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{collegeName ? collegeName.charAt(0).toUpperCase() + collegeName.slice(1) : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Horizontal Step-Based Progress Bar */}
            <div className="relative">
              <div className="flex items-center justify-between">
                {[
                  { label: 'Info', step: 1, completed: student.progress.information ?? true },
                  { label: 'Assessment', step: 2, completed: student.progress.assessment },
                  { label: 'TR1', step: 3, completed: student.progress.tr1 },
                  { label: 'TR2', step: 4, completed: student.progress.tr2 },
                  { label: 'Final Verdict', step: 5, completed: !!verdict },
                ].map((item, index, array) => (
                  <div key={item.step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      {/* Step Circle */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        item.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : currentStep === item.step
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {item.completed ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-xs font-semibold">{item.step}</span>
                        )}
                      </div>
                      {/* Step Label */}
                      <p className={`mt-2 text-xs font-medium text-center ${
                        item.completed
                          ? 'text-green-600'
                          : currentStep === item.step
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}>
                        {item.label}
                      </p>
                    </div>
                    {/* Connecting Line */}
                    {index < array.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 -mt-4 ${
                        item.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex justify-center items-center">
              {[
                { id: 'overall', label: 'Evaluation Overview' },
                { id: 'tr1', label: 'TR1 Round Result' },
                { id: 'tr2', label: 'TR2 Round Result' },
                { id: 'verdict', label: 'Final Verdict' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-6 py-4 font-medium text-sm transition-colors whitespace-nowrap border-b-2 text-center ${
                    activeTab === tab.id
                      ? 'text-red-600 border-red-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Evaluation Details - Full Width */}
        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {activeTab === 'overall' && (
                <div className="p-6 space-y-6">

                  {/* Assessment Scores Section - Compact */}
                  {(() => {
                    const scores = student.assessment?.scores || {}
                    
                    // Define all assessment fields
                    const skillPairs = [
                      { studentKey: 'coding_student_score', sectionKey: 'coding_section_score', label: 'Coding' },
                      { studentKey: 'dsa_student_score', sectionKey: 'dsa_section_score', label: 'DSA' },
                      { studentKey: 'cs_fundamentals_student_score', sectionKey: 'cs_fundamentals_section_score', label: 'CS Fundamentals' },
                      { studentKey: 'quantitative_student_score', sectionKey: 'quantitative_section_score', label: 'Quantitative Aptitude' },
                      { studentKey: 'verbal_student_score', sectionKey: 'verbal_section_score', label: 'Verbal Ability' },
                      { studentKey: 'logical_student_score', sectionKey: 'logical_section_score', label: 'Logical Reasoning' },
                    ]
                    
                    const hasData = skillPairs.some(pair => 
                      scores[pair.studentKey] !== undefined || scores[pair.sectionKey] !== undefined
                    ) || scores.student_assessment_score !== undefined
                    
                    if (hasData) {
                      return (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">An evaluation of all skills</h3>
                          
                          {/* Overall Assessment Score - Compact */}
                          {scores.student_assessment_score !== undefined && (
                            <div className="mb-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">Student Assessment Score</span>
                                <span className="text-xl font-bold text-gray-900">{scores.student_assessment_score}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* All Assessment Scores Table - Compact */}
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-3">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student Score</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Section Score (Max)</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {skillPairs.map((pair) => {
                                  const studentScore = scores[pair.studentKey] !== undefined ? parseFloat(String(scores[pair.studentKey] || '0')) : null
                                  const sectionScore = scores[pair.sectionKey] !== undefined ? parseFloat(String(scores[pair.sectionKey] || '100')) : null
                                  const percentage = sectionScore !== null && sectionScore > 0 && studentScore !== null ? (studentScore / sectionScore) * 100 : null
                                  
                                  return (
                                    <tr key={pair.label}>
                                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{pair.label}</td>
                                      <td className="px-4 py-2.5 text-sm text-gray-700">
                                        {studentScore !== null ? studentScore : 'N/A'}
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-gray-700">
                                        {sectionScore !== null ? sectionScore : 'N/A'}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        {percentage !== null ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900">{percentage.toFixed(1)}%</span>
                                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full ${
                                                  percentage >= 80 ? 'bg-green-500' :
                                                  percentage >= 60 ? 'bg-yellow-500' :
                                                  'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.min(100, percentage)}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-gray-500">N/A</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                          
                        </div>
                      )
                    }
                    return null
                  })()}


                  {/* Access Portal */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Access Student Portal</h3>
                      <p className="text-gray-600 text-sm mb-3">Verify with mobile and OTP to access student data</p>
                      {(() => {
                        const reportLinks = student.assessment?.report_links
                        const links = reportLinks 
                          ? (typeof reportLinks === 'string' 
                              ? reportLinks.split(',').map(l => l.trim()).filter(Boolean)
                              : Array.isArray(reportLinks) 
                                ? reportLinks 
                                : [reportLinks].filter(Boolean))
                          : []
                        
                        const firstReportLink = links.length > 0 ? links[0] : null
                        const verifyUrl = 'https://example.com/verify?student=' + student_uid
                        const buttonUrl = firstReportLink || verifyUrl
                        
                        return (
                          <button
                            onClick={() => {
                              window.open(buttonUrl, '_blank')
                            }}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            {firstReportLink ? 'View Report & Access Portal' : 'Verify & Access Portal'}
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tr1' && (
                <div className="p-6 space-y-6">
            {student.tr1 && Object.keys(student.tr1).length > 0 ? (
              <>
                {/* Total Score - First */}
                {student.tr1.total_score !== undefined && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Total Score</h2>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-gray-900">{student.tr1.total_score} / 100</span>
                        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (student.tr1.total_score || 0))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Communication Section */}
                {(student.tr1.communication !== undefined || student.tr1.remarks_on_communication || student.tr1.remarks_on_internships_projects) && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    {student.tr1.communication !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Communication</span>
                          <span className="text-xl font-bold text-gray-900">{student.tr1.communication} / 5</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(student.tr1.communication / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {student.tr1.remarks_on_communication && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">Remarks on Communication: </span>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.remarks_on_communication}</p>
                      </div>
                    )}
                    {student.tr1.remarks_on_internships_projects && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Remarks on Internships & Projects: </span>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.remarks_on_internships_projects}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Coding Problems - Problem 1 and Problem 2 in same row */}
                {(student.tr1.coding_problem_asked || student.tr1.problem_1 || student.tr1.problem_2) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Problem 1 */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Problem 1</h3>
                      {student.tr1.coding_problem_asked && (() => {
                        const text = String(student.tr1.coding_problem_asked || '')
                        const urlRegex = /(https?:\/\/[^\s]+)/g
                        const parts = text.split(urlRegex)
                        const links = parts.filter(part => urlRegex.test(part))
                        const firstLink = links[0]
                        
                        return firstLink ? (
                          <div className="mb-4">
                            <a
                              href={firstLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                            >
                              {firstLink}
                            </a>
                          </div>
                        ) : null
                      })()}
                      <div className="space-y-2 text-sm">
                        {student.tr1.problem_1?.problem_solving_rating !== undefined && (
                          <div>
                            <span className="font-medium text-gray-700">Problem Solving (Rating out of 5): </span>
                            <span className="text-gray-900">{student.tr1.problem_1.problem_solving_rating}/5</span>
                          </div>
                        )}
                        {student.tr1.problem_1?.problem_solving_remarks && (
                          <div>
                            <span className="font-medium text-gray-700">Remarks on Problem Solving: </span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.problem_1.problem_solving_remarks}</p>
                          </div>
                        )}
                        {student.tr1.problem_1?.code_implementation_rating !== undefined && (
                          <div>
                            <span className="font-medium text-gray-700">Code Implementation (Rating out of 5): </span>
                            <span className="text-gray-900">{student.tr1.problem_1.code_implementation_rating}/5</span>
                          </div>
                        )}
                        {student.tr1.problem_1?.code_implementation_remarks && (
                          <div>
                            <span className="font-medium text-gray-700">Remarks on Code Implementation: </span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.problem_1.code_implementation_remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Problem 2 */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Problem 2</h3>
                      {student.tr1.coding_problem_asked && (() => {
                        const text = String(student.tr1.coding_problem_asked || '')
                        const urlRegex = /(https?:\/\/[^\s]+)/g
                        const parts = text.split(urlRegex)
                        const links = parts.filter(part => urlRegex.test(part))
                        const secondLink = links[1]
                        
                        return secondLink ? (
                          <div className="mb-4">
                            <a
                              href={secondLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                            >
                              {secondLink}
                            </a>
                          </div>
                        ) : null
                      })()}
                      <div className="space-y-2 text-sm">
                        {student.tr1.problem_2?.problem_solving_rating !== undefined && (
                          <div>
                            <span className="font-medium text-gray-700">Problem Solving (Rating out of 5): </span>
                            <span className="text-gray-900">{student.tr1.problem_2.problem_solving_rating}/5</span>
                          </div>
                        )}
                        {student.tr1.problem_2?.problem_solving_remarks && (
                          <div>
                            <span className="font-medium text-gray-700">Remarks on Problem Solving: </span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.problem_2.problem_solving_remarks}</p>
                          </div>
                        )}
                        {student.tr1.problem_2?.code_implementation_rating !== undefined && (
                          <div>
                            <span className="font-medium text-gray-700">Code Implementation (Rating out of 5): </span>
                            <span className="text-gray-900">{student.tr1.problem_2.code_implementation_rating}/5</span>
                          </div>
                        )}
                        {student.tr1.problem_2?.code_implementation_remarks && (
                          <div>
                            <span className="font-medium text-gray-700">Remarks on Code Implementation: </span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.problem_2.code_implementation_remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* DSA Theory and Core CS Theory in one row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* DSA Theory */}
                  {(student.tr1.dsa_theory || student.tr1.remarks_on_dsa_theory) && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">DSA Theory</h3>
                      <div className="space-y-2 text-sm">
                        {student.tr1.dsa_theory && (
                          <div>
                            <span className="font-medium text-gray-700">DSA Theory: </span>
                            <span className="text-gray-900">{student.tr1.dsa_theory}/5</span>
                          </div>
                        )}
                        {student.tr1.remarks_on_dsa_theory && (
                          <div>
                            <span className="font-medium text-gray-700">Remarks on DSA Theory: </span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.remarks_on_dsa_theory}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Core CS Theory */}
                  {(student.tr1.core_cs_theory || student.tr1.remarks_on_core_cs_theory) && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Core CS Theory</h3>
                      <div className="space-y-2 text-sm">
                        {student.tr1.core_cs_theory && (
                          <div>
                            <span className="font-medium text-gray-700">Core CS Theory: </span>
                            <span className="text-gray-900">{student.tr1.core_cs_theory}/5</span>
                          </div>
                        )}
                        {student.tr1.remarks_on_core_cs_theory && (
                          <div>
                            <span className="font-medium text-gray-700">Remarks on Core CS Theory: </span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr1.remarks_on_core_cs_theory}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Overall Comments */}
                {student.tr1.overall_comments && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Overall Comments</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.tr1.overall_comments}</p>
                  </div>
                )}

                {/* DSA CD Team Remarks */}
                {student.tr1.dsa_cd_team_remarks && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">DSA CD Team Remarks</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.tr1.dsa_cd_team_remarks}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <p className="text-gray-500">No TR1 data available</p>
              </div>
                )}
                </div>
              )}

              {activeTab === 'tr2' && (
                <div className="p-6 space-y-6">
            {student.tr2 && Object.keys(student.tr2).length > 0 ? (
              <>
                {/* Overall Score - First */}
                {student.tr2.overall_score !== undefined && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Overall Score</h2>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-gray-900">{student.tr2.overall_score} / 100</span>
                        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (student.tr2.overall_score || 0))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interview Date and Recording Link */}
                {(student.tr2.interview_date || student.tr2.recording_link) && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {student.tr2.interview_date && (
                        <div>
                          <span className="font-medium text-gray-700">Interview Date: </span>
                          <span className="text-gray-900">{student.tr2.interview_date}</span>
                        </div>
                      )}
                      {student.tr2.recording_link && (
                        <div>
                          <span className="font-medium text-gray-700">Recording Link: </span>
                          {(() => {
                            const shortenUrl = (url: string) => {
                              try {
                                const urlObj = new URL(url)
                                return urlObj.hostname + (urlObj.pathname.length > 30 ? urlObj.pathname.substring(0, 30) + '...' : urlObj.pathname)
                              } catch {
                                return url.length > 50 ? url.substring(0, 50) + '...' : url
                              }
                            }
                            return (
                              <a
                                href={student.tr2.recording_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-sm"
                                title={student.tr2.recording_link}
                              >
                                {shortenUrl(student.tr2.recording_link)}
                              </a>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Soft Skills Group */}
                {((student.tr2.soft_skills && 'presentability' in student.tr2.soft_skills) || 
                  (student.tr2.soft_skills && 'communication' in student.tr2.soft_skills) || 
                  (student.tr2.projects && 'communication_project_rating' in student.tr2.projects)) && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Soft Skills</h3>
                    <div className="space-y-3 text-sm">
                      {(student.tr2.soft_skills && 'presentability' in student.tr2.soft_skills) && (
                        <div>
                          <span className="font-medium text-gray-700">Presentability: </span>
                          <span className="text-gray-900">{student.tr2.soft_skills.presentability || 'N/A'}</span>
                        </div>
                      )}
                      {(student.tr2.soft_skills && 'communication' in student.tr2.soft_skills) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">Communication (3mins discussion)</span>
                            <span className="text-gray-900">{student.tr2.soft_skills.communication}/100</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${Math.min(100, (parseFloat(student.tr2.soft_skills.communication) / 100) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {student.tr2.projects?.communication_project_rating !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">Communication & Project Rating</span>
                            <span className="text-gray-900">{student.tr2.projects.communication_project_rating}/100</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${Math.min(100, (parseFloat(student.tr2.projects.communication_project_rating) / 100) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Project Group */}
                {(student.tr2.projects?.projects_explanation || student.tr2.projects?.projects_type || student.tr2.projects?.project_rating !== undefined) && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Project</h3>
                    <div className="space-y-2 text-sm">
                      {student.tr2.projects?.projects_explanation && (
                        <div>
                          <span className="font-medium text-gray-700">Projects Explanation: </span>
                          <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr2.projects.projects_explanation}</p>
                        </div>
                      )}
                      {student.tr2.projects?.projects_type && (
                        <div>
                          <span className="font-medium text-gray-700">Projects Type: </span>
                          <span className="text-gray-900">{student.tr2.projects.projects_type}</span>
                        </div>
                      )}
                      {student.tr2.projects?.project_rating !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">Project Rating: </span>
                            <span className="text-gray-900">{student.tr2.projects.project_rating}/100</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${Math.min(100, (parseFloat(student.tr2.projects.project_rating) / 100) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Frontend Group */}
                {((student.tr2.frontend && 'html_css_js_theory' in student.tr2.frontend) || 
                  (student.tr2.frontend && 'react_architecture' in student.tr2.frontend) || 
                  (student.tr2.frontend && 'react_coding' in student.tr2.frontend) || 
                  (student.tr2.frontend && 'frontend_score' in student.tr2.frontend)) && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Frontend (Theory+Coding)</h3>
                    <div className="space-y-2 text-sm">
                      {(student.tr2.frontend && 'html_css_js_theory' in student.tr2.frontend) && (
                        <div>
                          <span className="font-medium text-gray-700">Basic HTML, CSS, JavaScript Theory Questions: </span>
                          <span className="text-gray-900">{student.tr2.frontend.html_css_js_theory || 'N/A'}</span>
                        </div>
                      )}
                      {(student.tr2.frontend && 'react_architecture' in student.tr2.frontend) && (
                        <div>
                          <span className="font-medium text-gray-700">React Advance & Frontend Architecture Questions: </span>
                          <span className="text-gray-900">{student.tr2.frontend.react_architecture || 'N/A'}</span>
                        </div>
                      )}
                      {student.tr2.frontend?.react_coding && (
                        <div>
                          <span className="font-medium text-gray-700">JavaScript /React JS (1 MediumLevel): </span>
                          <div className="mt-2 bg-gray-50 rounded p-3">
                            <p className="text-gray-700 whitespace-pre-wrap font-mono text-xs">{student.tr2.frontend.react_coding}</p>
                          </div>
                          {(() => {
                            const text = String(student.tr2.frontend.react_coding || '')
                            const urlRegex = /(https?:\/\/[^\s]+)/g
                            const urls = text.match(urlRegex) || []
                            const shortenUrl = (url: string) => {
                              try {
                                const urlObj = new URL(url)
                                return urlObj.hostname + (urlObj.pathname.length > 30 ? urlObj.pathname.substring(0, 30) + '...' : urlObj.pathname)
                              } catch {
                                return url.length > 50 ? url.substring(0, 50) + '...' : url
                              }
                            }
                            return urls.length > 0 ? (
                              <div className="mt-2 space-y-1">
                                {urls.map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800 underline text-xs" title={url}>
                                    {shortenUrl(url)}
                                  </a>
                                ))}
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                      {student.tr2.frontend?.frontend_score !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">Frontend Score: </span>
                            <span className="text-gray-900">{student.tr2.frontend.frontend_score}/100</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, (parseFloat(student.tr2.frontend.frontend_score) / 100) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Backend Group */}
                {(student.tr2.backend?.node_express_theory || student.tr2.backend?.mongodb_theory || student.tr2.backend?.backend_architecture || student.tr2.backend?.backend_endpoint || student.tr2.backend?.backend_score !== undefined) && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Backend (Theory+Coding)</h3>
                    <div className="space-y-2 text-sm">
                      {student.tr2.backend?.node_express_theory && (
                        <div>
                          <span className="font-medium text-gray-700">Node.js & Express.js Theory Discussion: </span>
                          <span className="text-gray-900">{student.tr2.backend.node_express_theory}</span>
                        </div>
                      )}
                      {student.tr2.backend?.mongodb_theory && (
                        <div>
                          <span className="font-medium text-gray-700">MongoDB Theory & Query Discussion: </span>
                          <span className="text-gray-900">{student.tr2.backend.mongodb_theory}</span>
                        </div>
                      )}
                      {student.tr2.backend?.backend_architecture && (
                        <div>
                          <span className="font-medium text-gray-700">Backend Architecture Questions: </span>
                          <span className="text-gray-900">{student.tr2.backend.backend_architecture}</span>
                        </div>
                      )}
                      {student.tr2.backend?.backend_endpoint && (
                        <div>
                          <span className="font-medium text-gray-700">Backend Endpoint: </span>
                          <div className="mt-2 bg-gray-50 rounded p-3">
                            <p className="text-gray-700 whitespace-pre-wrap font-mono text-xs">{student.tr2.backend.backend_endpoint}</p>
                          </div>
                          {(() => {
                            const text = String(student.tr2.backend.backend_endpoint || '')
                            const urlRegex = /(https?:\/\/[^\s]+)/g
                            const urls = text.match(urlRegex) || []
                            const shortenUrl = (url: string) => {
                              try {
                                const urlObj = new URL(url)
                                return urlObj.hostname + (urlObj.pathname.length > 30 ? urlObj.pathname.substring(0, 30) + '...' : urlObj.pathname)
                              } catch {
                                return url.length > 50 ? url.substring(0, 50) + '...' : url
                              }
                            }
                            return urls.length > 0 ? (
                              <div className="mt-2 space-y-1">
                                {urls.map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800 underline text-xs" title={url}>
                                    {shortenUrl(url)}
                                  </a>
                                ))}
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                      {student.tr2.backend?.backend_score !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">Backend Score: </span>
                            <span className="text-gray-900">{student.tr2.backend.backend_score}/100</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${Math.min(100, (parseFloat(student.tr2.backend.backend_score) / 100) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Internship Group */}
                {(student.tr2.experience?.cs_fundamentals || student.tr2.experience?.scenario_based_questions || student.tr2.experience?.internships_experience || student.tr2.experience?.internship_explanation || student.tr2.experience?.certificates || student.tr2.experience?.internship_score !== undefined) && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Internship</h3>
                    <div className="space-y-2 text-sm">
                      {student.tr2.experience?.cs_fundamentals && (
                        <div>
                          <span className="font-medium text-gray-700">CS Fundamentals: </span>
                          <span className="text-gray-900">{student.tr2.experience.cs_fundamentals}</span>
                        </div>
                      )}
                      {student.tr2.experience?.scenario_based_questions && (
                        <div>
                          <span className="font-medium text-gray-700">Scenario-Based Questions (Full Stack Integration): </span>
                          <span className="text-gray-900">{student.tr2.experience.scenario_based_questions}</span>
                        </div>
                      )}
                      {student.tr2.experience?.internships_experience && (
                        <div>
                          <span className="font-medium text-gray-700">Internships & Practical Experience: </span>
                          <span className="text-gray-900">{student.tr2.experience.internships_experience}</span>
                        </div>
                      )}
                      {student.tr2.experience?.internship_explanation && (
                        <div>
                          <span className="font-medium text-gray-700">Ability to Explain Internship Tasks: </span>
                          <p className="text-gray-700 mt-1 whitespace-pre-wrap">{student.tr2.experience.internship_explanation}</p>
                        </div>
                      )}
                      {student.tr2.experience?.certificates && (
                        <div>
                          <span className="font-medium text-gray-700">Certificates & Achievements: </span>
                          <div className="mt-2 space-y-1">
                            {(() => {
                              const text = String(student.tr2.experience.certificates || '')
                              const urlRegex = /(https?:\/\/[^\s]+)/g
                              const parts = text.split(urlRegex)
                              const shortenUrl = (url: string) => {
                                try {
                                  const urlObj = new URL(url)
                                  return urlObj.hostname + (urlObj.pathname.length > 30 ? urlObj.pathname.substring(0, 30) + '...' : urlObj.pathname)
                                } catch {
                                  return url.length > 50 ? url.substring(0, 50) + '...' : url
                                }
                              }
                              return parts.map((part, idx) => {
                                if (urlRegex.test(part)) {
                                  return (
                                    <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800 underline text-xs" title={part}>
                                      {shortenUrl(part)}
                                    </a>
                                  )
                                }
                                return part ? <p key={idx} className="text-gray-700 text-sm">{part}</p> : null
                              })
                            })()}
                          </div>
                        </div>
                      )}
                      {student.tr2.experience?.internship_score !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">Internship Score: </span>
                            <span className="text-gray-900">{student.tr2.experience.internship_score}/100</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${Math.min(100, (parseFloat(student.tr2.experience.internship_score) / 100) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Knowledge */}
                {student.tr2.ai_knowledge && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Knowledge</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.tr2.ai_knowledge}</p>
                  </div>
                )}

                {/* Overall Remarks */}
                {student.tr2.overall_remarks && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Overall Remarks</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.tr2.overall_remarks}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <p className="text-gray-500">No TR2 data available</p>
              </div>
                )}
                </div>
              )}

              {activeTab === 'verdict' && (
                <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Final Verdict</h2>
              </div>
            </div>

            {verdict ? (
              <>
                {/* Decision Card - Support both new AI format and legacy format */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Final Recommendation</h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-6">
                      {(() => {
                        // Use new AI recommendation format if available, fallback to legacy decision
                        const recommendation = verdict.recommendation || verdict.decision || 'Weak Hire'
                        const isAccepted = recommendation === 'Strong Hire' || recommendation === 'Hire' || recommendation === 'Accepted'
                        const isRejected = recommendation === 'Rejected'
                        const isWeakHire = recommendation === 'Weak Hire'
                        
                        return (
                          <>
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${
                              isAccepted ? 'bg-green-100 text-green-700' :
                              isRejected ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {isAccepted ? '✓' : isRejected ? '✗' : '○'}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-gray-900 mb-2">{recommendation}</h3>
                              {verdict.reviewer_name && (
                                <p className="text-sm text-gray-600">Reviewed by {verdict.reviewer_name}</p>
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Overall Summary - New AI format */}
                {verdict.summary && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Overall Summary</h2>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{verdict.summary}</p>
                    </div>
                  </div>
                )}

                {/* Strengths - New AI format */}
                {verdict.strengths && verdict.strengths.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Strengths</h2>
                    </div>
                    <div className="p-6">
                      <ul className="space-y-2">
                        {verdict.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Areas for Improvement - New AI format */}
                {verdict.improvements && verdict.improvements.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Areas for Improvement</h2>
                    </div>
                    <div className="p-6">
                      <ul className="space-y-2">
                        {verdict.improvements.map((improvement, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-orange-600 mt-1">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Legacy format support - Comments */}
                {verdict.comments && !verdict.summary && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{verdict.comments}</p>
                    </div>
                  </div>
                )}

                {/* Legacy format support - Analysis Breakdown */}
                {(verdict.assessment_notes || verdict.tr1_notes || verdict.tr2_notes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {verdict.assessment_notes && (
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Assessment Analysis
                          </h3>
                        </div>
                        <div className="p-6">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{verdict.assessment_notes}</p>
                        </div>
                      </div>
                    )}
                    {verdict.tr1_notes && (
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            TR1 Interview Analysis
                          </h3>
                        </div>
                        <div className="p-6">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{verdict.tr1_notes}</p>
                        </div>
                      </div>
                    )}
                    {verdict.tr2_notes && (
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm md:col-span-2">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            TR2 Interview Analysis
                          </h3>
                        </div>
                        <div className="p-6">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{verdict.tr2_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy format support - Internal Review */}
                {verdict.internal_review && (
                  <Accordion title="Internal Review" icon="🔍" defaultOpen>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{verdict.internal_review}</p>
                  </Accordion>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                <p className="text-gray-500">Generating verdict...</p>
              </div>
            )}
                </div>
              )}
            </div>
      </div>
    </div>
  )
}
