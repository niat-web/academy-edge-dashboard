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
  recommended_role_fit?: string
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
  const [detailedScoresTab, setDetailedScoresTab] = useState<'assessment' | 'tr1' | 'tr2' | 'remarks'>('assessment')

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


      {/* Main Content - Full Width Layout */}
      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Evaluation Details - Full Width */}
        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {activeTab === 'overall' && (
                <div className="p-6 space-y-6">
                  {/* Header Section - Icon, Name, College, Final Verdict */}
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                      {student.basic_info?.name ? student.basic_info.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    {/* Name and College */}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900">
                  {student.basic_info?.name ? student.basic_info.name.charAt(0).toUpperCase() + student.basic_info.name.slice(1) : 'N/A'}
                </h2>
                      <p className="text-gray-600 mt-1">{collegeName ? collegeName.charAt(0).toUpperCase() + collegeName.slice(1) : 'N/A'}</p>
                </div>
                    {/* Final Verdict */}
                    {(() => {
                      const recommendation = verdict?.recommendation || verdict?.decision || 'Weak Hire'
                      const isStrongHire = recommendation === 'Strong Hire'
                      const isHire = recommendation === 'Hire'
                      const isWeakHire = recommendation === 'Weak Hire'
                      
                      return (
                        <div className={`px-6 py-3 rounded-lg font-bold text-lg ${
                          isStrongHire ? 'bg-green-100 text-green-700' :
                          isHire ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {recommendation.toUpperCase()}
              </div>
                      )
                    })()}
            </div>

                  {/* Key Metrics Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const scores = student.assessment?.scores || {}
                      const dsaScore = scores.dsa_student_score ? parseFloat(String(scores.dsa_student_score)) : null
                      const dsaSection = scores.dsa_section_score ? parseFloat(String(scores.dsa_section_score)) : null
                      const codingScore = scores.coding_student_score ? parseFloat(String(scores.coding_student_score)) : null
                      const codingSection = scores.coding_section_score ? parseFloat(String(scores.coding_section_score)) : null
                      const csFundamentalsScore = scores.cs_fundamentals_student_score ? parseFloat(String(scores.cs_fundamentals_student_score)) : null
                      const csFundamentalsSection = scores.cs_fundamentals_section_score ? parseFloat(String(scores.cs_fundamentals_section_score)) : null
                      const communication = student.tr1?.communication ? parseFloat(String(student.tr1.communication)) : null
                      
                      return (
                        <>
                          {/* DSA Score */}
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">DSA SCORE</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {dsaScore !== null ? dsaScore : 'N/A'}
                              {dsaSection !== null && dsaScore !== null && ` / ${dsaSection}`}
                            </div>
                          </div>
                          
                          {/* Coding */}
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">CODING</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {codingScore !== null && codingSection !== null && codingSection > 0
                                ? `${((codingScore / codingSection) * 100).toFixed(1)}%`
                                : codingScore !== null ? codingScore : 'N/A'}
                            </div>
                          </div>
                          
                          {/* CS Fundamentals */}
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">CS FUNDAMENTALS</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {csFundamentalsScore !== null && csFundamentalsSection !== null && csFundamentalsSection > 0
                                ? `${((csFundamentalsScore / csFundamentalsSection) * 100).toFixed(1)}%`
                                : csFundamentalsScore !== null ? csFundamentalsScore : 'N/A'}
                            </div>
                          </div>
                          
                          {/* Communication */}
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">COMMUNICATION</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {communication !== null ? `${communication} / 5` : 'N/A'}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Overall Summary */}
                  {verdict?.summary && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Executive Summary</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{verdict.summary}</p>
                    </div>
                  )}

                  {/* Evidence Vault */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidence Vault</h3>
                    <div className="space-y-4">
                      {/* First Row: Access Student Portal, TR2 Recording, and TR1 Recording */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Access Student Portal */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Access Student Portal</h4>
                          <p className="text-xs text-gray-600 mb-3">Mobile: 9800141844 | OTP: 561811</p>
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
                            
                            return (
                              <button
                                onClick={() => {
                                  if (firstReportLink) {
                                    window.open(firstReportLink, '_blank')
                                  }
                                }}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                disabled={!firstReportLink}
                              >
                                {firstReportLink ? 'View Complete Report' : 'No Link Available'}
                              </button>
                            )
                          })()}
                        </div>
                        
                        {/* TR2 Recording Link */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Interview Recording</h4>
                          <p className="text-xs text-gray-600 mb-3">TR2 Interview Recording</p>
                          {student.tr2?.recording_link ? (
                            <button
                              onClick={() => {
                                window.open(student.tr2.recording_link, '_blank')
                              }}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                            >
                              WATCH
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium text-sm cursor-not-allowed"
                            >
                              No Recording Available
                            </button>
                        )}
                      </div>

                        {/* TR1 Recording Link */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Interview Recording</h4>
                          <p className="text-xs text-gray-600 mb-3">TR1 Interview Recording</p>
                          {student.tr1?.interview_recording_link ? (
                            <button
                              onClick={() => {
                                window.open(student.tr1.interview_recording_link, '_blank')
                              }}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                            >
                              WATCH
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium text-sm cursor-not-allowed"
                            >
                              No Recording Available
                            </button>
                          )}
                    </div>
                      </div>
                      
                      {/* Second Row: LeetCode Problems */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                          const codingProblem = student.tr1?.coding_problem_asked || ''
                          // Extract all URLs using regex - handles cases with no space/comma between links
                          let urls: string[] = []
                          if (codingProblem) {
                            // First try splitting by comma
                            const commaSplit = codingProblem.split(',').map((s: string) => s.trim())
                            if (commaSplit.length > 1) {
                              urls = commaSplit.filter((s: string) => s.startsWith('http'))
                            } else {
                              // Try splitting by space
                              const spaceSplit = codingProblem.split(/\s+/)
                              urls = spaceSplit.filter((s: string) => s.startsWith('http'))
                            }
                            
                            // If still no URLs found or need to handle concatenated URLs, use regex extraction
                            // This regex will find URLs even if they're concatenated without separators
                            if (urls.length === 0 || urls.length < 2) {
                              const urlRegex = /https?:\/\/[^\s,]+/g
                              const regexMatches = codingProblem.match(urlRegex) || []
                              if (regexMatches.length > 0) {
                                urls = regexMatches
                              }
                            }
                          }
                          const problem1Url = urls[0] || null
                          const problem2Url = urls[1] || null
                          
                          return (
                            <>
                              {/* LeetCode Problem 1 */}
                              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">LeetCode Problem 1</h4>
                                {problem1Url ? (
                                  <button
                                    onClick={() => window.open(problem1Url, '_blank')}
                                    className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm w-full justify-center"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    VIEW CODE
                                  </button>
                                ) : (
                                  <div className="text-xs text-gray-500">No Problem Available</div>
                    )}
                  </div>
                              
                              {/* LeetCode Problem 2 */}
                              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">LeetCode Problem 2</h4>
                                {problem2Url ? (
                                  <button
                                    onClick={() => window.open(problem2Url, '_blank')}
                                    className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm w-full justify-center"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    VIEW CODE
                                  </button>
                                ) : (
                                  <div className="text-xs text-gray-500">No Problem Available</div>
                                )}
                              </div>
                            </>
                          )
                        })()}
              </div>
            </div>
          </div>

                  {/* Detailed Scores */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-900">Detailed Scores</h3>
                    </div>

                     {/* Tab Navigation - Centered with equal spacing */}
                     <div className="flex justify-center gap-2 mb-6 border-b border-gray-200">
                       {[
                         { id: 'assessment', label: 'Overall Evaluation' },
                         { id: 'tr1', label: 'TR1' },
                         { id: 'tr2', label: 'TR2' },
                         { id: 'remarks', label: 'Final Verdict' },
              ].map((tab) => (
                <button
                  key={tab.id}
                          onClick={() => setDetailedScoresTab(tab.id as any)}
                          className={`flex-1 max-w-[200px] px-4 py-2 font-medium text-sm transition-colors text-center ${
                            detailedScoresTab === tab.id
                              ? 'bg-white text-gray-900 border-b-2 border-gray-900 rounded-t-lg'
                              : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

                    {/* Tab Content */}
                    <div className="mt-4">
                      {/* Assessment Tab */}
                      {detailedScoresTab === 'assessment' && (() => {
                        const scores = student.assessment?.scores || {}
                        const codingScore = scores.coding_student_score ? parseFloat(String(scores.coding_student_score)) : null
                        const codingMax = scores.coding_section_score ? parseFloat(String(scores.coding_section_score)) : null
                        const dsaScore = scores.dsa_student_score ? parseFloat(String(scores.dsa_student_score)) : null
                        const dsaMax = scores.dsa_section_score ? parseFloat(String(scores.dsa_section_score)) : null
                        const csScore = scores.cs_fundamentals_student_score ? parseFloat(String(scores.cs_fundamentals_student_score)) : null
                        const csMax = scores.cs_fundamentals_section_score ? parseFloat(String(scores.cs_fundamentals_section_score)) : null
                        
                         return (
                           <div className="space-y-4">
                             {/* Score Cards Section */}
                             <div>
                               <h5 className="text-sm font-semibold text-gray-900 mb-3">Assessment Scores</h5>
                               <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Coding Card */}
                                {codingScore !== null && codingMax !== null && (
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="text-sm font-medium text-gray-600 mb-2">Coding</div>
                                    <div className="text-2xl font-bold text-gray-900 mb-1">
                                      {codingScore.toFixed(2)} <span className="text-lg text-gray-500">/ {codingMax}</span>
          </div>
                                    <div className="text-sm text-gray-600 mb-3">
                                      {((codingScore / codingMax) * 100).toFixed(1)}%
        </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-600 rounded-full"
                                        style={{ width: `${Math.min(100, (codingScore / codingMax) * 100)}%` }}
                                      ></div>
      </div>
                                  </div>
                                )}
                                
                                {/* DSA MCQ Card */}
                                {dsaScore !== null && dsaMax !== null && (
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="text-sm font-medium text-gray-600 mb-2">DSA MCQ</div>
                                    <div className="text-2xl font-bold text-gray-900 mb-1">
                                      {dsaScore} <span className="text-lg text-gray-500">/ {dsaMax}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-3">
                                      {((dsaScore / dsaMax) * 100).toFixed(1)}%
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-600 rounded-full"
                                        style={{ width: `${Math.min(100, (dsaScore / dsaMax) * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* CS Fundamentals Card */}
                                {csScore !== null && csMax !== null && (
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="text-sm font-medium text-gray-600 mb-2">CS Fundamentals</div>
                                    <div className="text-2xl font-bold text-gray-900 mb-1">
                                      {csScore} <span className="text-lg text-gray-500">/ {csMax}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-3">
                                      {((csScore / csMax) * 100).toFixed(1)}%
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-600 rounded-full"
                                        style={{ width: `${Math.min(100, (csScore / csMax) * 100)}%` }}
                                      ></div>
                                    </div>
                                   </div>
                                 )}
                                 </div>
                               </div>
                             </div>
                             
                             {/* Remarks Box */}
                             {verdict?.summary && (
                               <div>
                                 <h5 className="text-sm font-semibold text-gray-900 mb-3">Overall Remarks</h5>
                                 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                   <p className="text-sm text-gray-700 italic">{verdict.summary}</p>
                                 </div>
                               </div>
                             )}
                           </div>
                         )
                       })()}

                      {/* TR1 Tab */}
                      {detailedScoresTab === 'tr1' && student.tr1 && Object.keys(student.tr1).length > 0 && (
                        <div className="space-y-4">
                          {/* Interview Date */}
                          {student.tr1.interview_date && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">Interview Date</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="text-sm text-gray-600">
                                  {student.tr1.interview_date}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Problem 1 */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Problem 1</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr1.problem_1?.problem_solving_rating !== undefined && (
                        <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Problem Solving (Rating out of 5)</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr1.problem_1.problem_solving_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_1.problem_solving_rating)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.problem_1?.problem_solving_remarks && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks on Problem Solving: </span>
                                  <p className="mt-1">{student.tr1.problem_1.problem_solving_remarks}</p>
                                </div>
                              )}
                              {student.tr1.problem_1?.code_implementation_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Code Implementation (Rating out of 5)</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr1.problem_1.code_implementation_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_1.code_implementation_rating)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.problem_1?.code_implementation_remarks && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks on Code Implementation: </span>
                                  <p className="mt-1">{student.tr1.problem_1.code_implementation_remarks}</p>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* Problem 2 */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Problem 2</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr1.problem_2?.problem_solving_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Problem Solving (Rating out of 5)</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr1.problem_2.problem_solving_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_2.problem_solving_rating)) / 5) * 100}%` }}
                                    ></div>
                              </div>
                            </div>
                          )}
                              {student.tr1.problem_2?.problem_solving_remarks && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks on Problem Solving: </span>
                                  <p className="mt-1">{student.tr1.problem_2.problem_solving_remarks}</p>
                                </div>
                              )}
                              {student.tr1.problem_2?.code_implementation_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Code Implementation (Rating out of 5)</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr1.problem_2.code_implementation_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_2.code_implementation_rating)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.problem_2?.code_implementation_remarks && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks on Code Implementation: </span>
                                  <p className="mt-1">{student.tr1.problem_2.code_implementation_remarks}</p>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* DSA Theory */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">DSA Theory</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr1.dsa_theory !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">DSA Theory</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr1.dsa_theory} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.dsa_theory)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.remarks_on_dsa_theory && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks on DSA Theory: </span>
                                  <p className="mt-1">{student.tr1.remarks_on_dsa_theory}</p>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* Core CS Theory */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Core CS Theory</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr1.core_cs_theory !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Core CS Theory</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr1.core_cs_theory} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.core_cs_theory)) / 5) * 100}%` }}
                                              ></div>
                                            </div>
                                          </div>
                              )}
                              {student.tr1.remarks_on_core_cs_theory && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks on Core CS Theory: </span>
                                  <p className="mt-1">{student.tr1.remarks_on_core_cs_theory}</p>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>
                          
                          {/* Overall Comments */}
                          {student.tr1.overall_comments && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">Overall Comments</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">{student.tr1.overall_comments}</p>
                        </div>
                            </div>
                          )}

                          {/* Total Score */}
                          {student.tr1.total_score !== undefined && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">Total Score</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Total Score (out of 100)</span>
                                <span className="text-lg font-bold text-gray-900">
                                  {student.tr1.total_score} / 100
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${Math.min(100, parseFloat(String(student.tr1.total_score)))}%` }}
                                 ></div>
                               </div>
                              </div>
                            </div>
                          )}

                          {/* DSA CD Team Remarks */}
                          {student.tr1.dsa_cd_team_remarks && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">DSA CD Team Remarks</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">{student.tr1.dsa_cd_team_remarks}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TR2 Tab */}
                      {detailedScoresTab === 'tr2' && student.tr2 && Object.keys(student.tr2).length > 0 && (
                        <div className="space-y-4">
                          {/* Interview Date */}
                          {student.tr2.interview_date && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">Interview Date</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="text-sm text-gray-600">
                                  {student.tr2.interview_date}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Soft Skills */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Soft Skills</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr2.soft_skills?.presentability && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Presentability: </span>
                                  <p className="mt-1">{student.tr2.soft_skills.presentability}</p>
                    </div>
                              )}
                              {student.tr2.soft_skills?.communication !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Communication (3mins discussion)</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr2.soft_skills.communication} / 100
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.soft_skills.communication)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr2.projects?.communication_project_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Communication & Project Rating</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr2.projects.communication_project_rating} / 100
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.projects.communication_project_rating)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* Project */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Project</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr2.projects?.projects_explanation && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Projects Explanation: </span>
                                  <p className="mt-1">{student.tr2.projects.projects_explanation}</p>
                                </div>
                              )}
                              {student.tr2.projects?.projects_type && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Projects Type: </span>
                                  <p className="mt-1">{student.tr2.projects.projects_type}</p>
                                </div>
                              )}
                              {student.tr2.projects?.project_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Project Rating</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr2.projects.project_rating} / 100
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.projects.project_rating)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* Frontend (Theory+Coding) */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Frontend (Theory+Coding)</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr2.frontend?.html_css_js_theory && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Basic HTML, CSS, JavaScript Theory Questions: </span>
                                  <p className="mt-1">{student.tr2.frontend.html_css_js_theory}</p>
                                </div>
                              )}
                              {student.tr2.frontend?.react_architecture && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">React Advance & Frontend Architecture Questions: </span>
                                  <p className="mt-1">{student.tr2.frontend.react_architecture}</p>
                                </div>
                              )}
                              {student.tr2.frontend?.react_coding && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">JavaScript /React JS (1 MediumLevel): </span>
                                  <div className="mt-2 bg-white rounded p-3 border border-gray-200">
                                    <p className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{student.tr2.frontend.react_coding}</p>
                                  </div>
                                </div>
                              )}
                              {student.tr2.frontend?.frontend_score !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Frontend Score</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr2.frontend.frontend_score} / 100
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.frontend.frontend_score)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* Backend (Theory+Coding) */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Backend (Theory+Coding)</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr2.backend?.node_express_theory && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Node.js & Express.js Theory Discussion: </span>
                                  <p className="mt-1">{student.tr2.backend.node_express_theory}</p>
                                </div>
                              )}
                              {student.tr2.backend?.mongodb_theory && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">MongoDB Theory & Query Discussion: </span>
                                  <p className="mt-1">{student.tr2.backend.mongodb_theory}</p>
                                </div>
                              )}
                              {student.tr2.backend?.backend_architecture && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Backend Architecture Questions: </span>
                                  <p className="mt-1">{student.tr2.backend.backend_architecture}</p>
                                </div>
                              )}
                              {student.tr2.backend?.backend_endpoint && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Backend Endpoint: </span>
                                  <div className="mt-2 bg-white rounded p-3 border border-gray-200">
                                    <p className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{student.tr2.backend.backend_endpoint}</p>
                                  </div>
                                </div>
                              )}
                              {student.tr2.backend?.backend_score !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Backend Score</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr2.backend.backend_score} / 100
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.backend.backend_score)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* Internship */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Internship</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {student.tr2.experience?.cs_fundamentals && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">CS Fundamentals: </span>
                                  <p className="mt-1">{student.tr2.experience.cs_fundamentals}</p>
                                </div>
                              )}
                              {student.tr2.experience?.scenario_based_questions && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Scenario-Based Questions (Full Stack Integration): </span>
                                  <p className="mt-1">{student.tr2.experience.scenario_based_questions}</p>
                                </div>
                              )}
                              {student.tr2.experience?.internships_experience && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Internships & Practical Experience: </span>
                                  <p className="mt-1">{student.tr2.experience.internships_experience}</p>
                                </div>
                              )}
                              {student.tr2.experience?.internship_explanation && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Ability to Explain Internship Tasks: </span>
                                  <p className="mt-1">{student.tr2.experience.internship_explanation}</p>
                                </div>
                              )}
                              {student.tr2.experience?.certificates && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Certificates & Achievements: </span>
                                  <p className="mt-1">{student.tr2.experience.certificates}</p>
                                </div>
                              )}
                              {student.tr2.experience?.internship_score !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Internship Score</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {student.tr2.experience.internship_score} / 100
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-800 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.experience.internship_score)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                               )}
                             </div>
                            </div>
                          </div>

                          {/* AI Knowledge */}
                          {student.tr2.ai_knowledge && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">AI Knowledge</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">{student.tr2.ai_knowledge}</p>
                              </div>
                            </div>
                          )}

                          {/* Overall Score */}
                          {student.tr2.overall_score !== undefined && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">Overall Score</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Overall Score</span>
                                <span className="text-lg font-bold text-gray-900">
                                  {student.tr2.overall_score} / 100
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${Math.min(100, parseFloat(String(student.tr2.overall_score)))}%` }}
                                 ></div>
                               </div>
                              </div>
                            </div>
                          )}

                          {/* Overall Remarks */}
                          {student.tr2.overall_remarks && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">Overall Remarks</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">{student.tr2.overall_remarks}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remarks Tab (Final Verdict) */}
                      {detailedScoresTab === 'remarks' && verdict && (
                        <div className="space-y-4">
                          {/* Technical Strengths */}
                          {verdict.strengths && verdict.strengths.length > 0 && (
                            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                              <h4 className="text-sm font-bold text-gray-900 mb-3">Technical Strengths</h4>
                              <ul className="space-y-2">
                                {verdict.strengths.map((strength, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-green-600 mt-1">•</span>
                                    <span>{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Development Areas */}
                          {verdict.improvements && verdict.improvements.length > 0 && (
                            <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4">
                              <h4 className="text-sm font-bold text-gray-900 mb-3">Development Areas</h4>
                              <ul className="space-y-2">
                                {verdict.improvements.map((improvement, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-orange-600 mt-1">•</span>
                                    <span>{improvement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Recommended Role Fit */}
                          {verdict.recommended_role_fit && (
                            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                              <h4 className="text-sm font-bold text-gray-900 mb-3">Recommended Role Fit</h4>
                              <p className="text-sm text-gray-700">
                      {(() => {
                                  const text = verdict.recommended_role_fit
                                  // Common role title patterns to highlight - ordered from most specific to least specific
                                  const rolePatterns = [
                                    /Software Development Engineer\s*-\s*Entry Level/gi,
                                    /Junior\s+Frontend\s+Developer/gi,
                                    /Junior\s+Backend\s+Developer/gi,
                                    /Junior\s+Full\s+Stack\s+Developer/gi,
                                    /Software\s+Development\s+Engineer/gi,
                                    /Frontend\s+Developer/gi,
                                    /Backend\s+Developer/gi,
                                    /Full\s+Stack\s+Developer/gi,
                                    /React\s+Developer/gi,
                                    /Node\.js\s+Developer/gi,
                                    /Web\s+Developer/gi,
                                    /Software\s+Engineer/gi,
                                    /Entry\s+Level/gi,
                                    /Mid\s+Level/gi,
                                    /Senior\s+[^.]*Developer/gi,
                                  ]
                                  
                                  let highlightedText = text
                                  const highlightedRanges: Array<{ start: number; end: number }> = []
                                  
                                  // Find all matches and their positions
                                  rolePatterns.forEach(pattern => {
                                    let match
                                    const regex = new RegExp(pattern.source, pattern.flags)
                                    while ((match = regex.exec(text)) !== null) {
                                      highlightedRanges.push({
                                        start: match.index,
                                        end: match.index + match[0].length
                                      })
                                    }
                                  })
                                  
                                  // Sort by start position and merge overlapping ranges
                                  highlightedRanges.sort((a, b) => a.start - b.start)
                                  const mergedRanges: Array<{ start: number; end: number }> = []
                                  for (const range of highlightedRanges) {
                                    if (mergedRanges.length === 0 || range.start > mergedRanges[mergedRanges.length - 1].end) {
                                      mergedRanges.push(range)
                                    } else {
                                      mergedRanges[mergedRanges.length - 1].end = Math.max(
                                        mergedRanges[mergedRanges.length - 1].end,
                                        range.end
                                      )
                                    }
                                  }
                                  
                                  // Build highlighted text by inserting tags
                                  let result = ''
                                  let lastIndex = 0
                                  mergedRanges.forEach(range => {
                                    result += text.substring(lastIndex, range.start)
                                    result += `<strong class="font-bold text-blue-700">${text.substring(range.start, range.end)}</strong>`
                                    lastIndex = range.end
                                  })
                                  result += text.substring(lastIndex)
                                  
                                  return <span dangerouslySetInnerHTML={{ __html: result }} />
                      })()}
                              </p>
                    </div>
                          )}
                        </div>
                      )}
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
