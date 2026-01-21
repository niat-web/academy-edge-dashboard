'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  User,
  Hash,
  GraduationCap,
  Code2,
  Terminal,
  BookOpen,
  MessageSquare,
  FileText,
  ShieldCheck,
  ExternalLink,
  Video,
  FileCode,
  BarChart3,
  LayoutDashboard,
  FileJson,
  Server,
  Award,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Search,
  Check,
  Circle,
  Brain,
  Calendar,
  Lightbulb,
  MarsStroke,
  AwardIcon,
  ChefHat,
  ClipboardList,
  Target,
  Sparkles,
  LucideGraduationCap,
  ServerCog,
  Layout,
  FolderKanban,
  HeartHandshake,
  TargetIcon,
  ClipboardListIcon,
  Library,
  GitBranch,
  Puzzle,
  Shield,
  Wrench,

  UserCheck,
  Play
} from 'lucide-react'
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
                {/* Name, College, and ID */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {student.basic_info?.name ? student.basic_info.name.charAt(0).toUpperCase() + student.basic_info.name.slice(1) : 'N/A'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-gray-600">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{collegeName ? collegeName.charAt(0).toUpperCase() + collegeName.slice(1) : 'N/A'}</span>
                  </div>
                </div>
                {/* Final Verdict */}
                {(() => {
                  const recommendation = verdict?.recommendation || verdict?.decision || 'Weak Hire'
                  const isStrongHire = recommendation === 'Strong Hire'
                  const isHire = recommendation === 'Hire'
                  const isWeakHire = recommendation === 'Weak Hire'

                  return (
                    <div className={`px-6 py-3 rounded-lg font-bold text-lg ${isStrongHire ? 'bg-green-100 text-green-700' :
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
                      <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 mb-3 uppercase tracking-wider">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Code2 className="w-4 h-4" />
                          </div>
                          DSA SCORE
                        </div>
                        <div className="text-3xl font-bold text-gray-900 leading-none">
                          {dsaScore !== null ? dsaScore : 'N/A'}
                          {dsaSection !== null && dsaScore !== null && <span className="text-lg text-gray-400 font-medium ml-1">/ {dsaSection}</span>}
                        </div>
                      </div>

                      {/* Coding */}
                      <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-xl border border-indigo-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 mb-3 uppercase tracking-wider">
                          <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Terminal className="w-4 h-4" />
                          </div>
                          CODING
                        </div>
                        <div className="text-3xl font-bold text-gray-900 leading-none">
                          {codingScore !== null && codingSection !== null && codingSection > 0
                            ? <>{((codingScore / codingSection) * 100).toFixed(1)}<span className="text-lg text-gray-400 font-medium ml-0.5">%</span></>
                            : codingScore !== null ? codingScore : 'N/A'}
                        </div>
                      </div>

                      {/* CS Fundamentals */}
                      <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-xl border border-emerald-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 mb-3 uppercase tracking-wider">
                          <div className="p-1.5 bg-emerald-100 rounded-lg">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          CS FUNDAMENTALS
                        </div>
                        <div className="text-3xl font-bold text-gray-900 leading-none">
                          {csFundamentalsScore !== null && csFundamentalsSection !== null && csFundamentalsSection > 0
                            ? <>{((csFundamentalsScore / csFundamentalsSection) * 100).toFixed(1)}<span className="text-lg text-gray-400 font-medium ml-0.5">%</span></>
                            : csFundamentalsScore !== null ? csFundamentalsScore : 'N/A'}
                        </div>
                      </div>

                      {/* Communication */}
                      <div className="bg-gradient-to-br from-purple-50/50 to-white rounded-xl border border-purple-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 mb-3 uppercase tracking-wider">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          COMMUNICATION
                        </div>
                        <div className="text-3xl font-bold text-gray-900 leading-none">
                          {communication !== null ? <>{communication}<span className="text-lg text-gray-400 font-medium ml-1">/ 5</span></> : 'N/A'}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Overall Summary */}
              {verdict?.summary && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
                  </div>
                  <ul className="space-y-2">
                    {verdict.summary.split('. ').filter(s => s.trim().length > 0).map((sentence, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        <span>{sentence.trim()}{!sentence.trim().endsWith('.') ? '.' : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence Vault */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Evidence Vault</h3>
                </div>
                <div className="space-y-4">
                  {/* First Row: Access Student Portal, TR2 Recording, and TR1 Recording */}
                  {/* First Row: Access Student Portal, TR2 Recording, and TR1 Recording */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Access Student Portal */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        Student Portal
                      </div>

                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <ExternalLink className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Access Portal</p>
                          <p className="text-xs text-gray-500">Mobile: 9800141844 | OTP: 561811</p>
                        </div>
                      </div>

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
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                            disabled={!firstReportLink}
                          >
                            View Report
                          </button>
                        )
                      })()}
                    </div>

                    {/* TR2 Recording Link */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        TR2 Interview
                      </div>

                      {student.tr2?.recording_link ? (
                        <>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                              <Video className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Recording Available</p>
                              {/* <p className="text-xs text-gray-500 uppercase">Duration: 45:12</p> */}
                              <p className="text-xs text-gray-500">Click below to watch</p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              window.open(student.tr2.recording_link, '_blank')
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-md"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            WATCH TR2
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <Video className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">No Recording</p>
                              <p className="text-xs text-gray-500">Not available</p>
                            </div>
                          </div>
                          <button
                            disabled
                            className="w-full px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg font-medium text-sm cursor-not-allowed border border-gray-200"
                          >
                            Unavailable
                          </button>
                        </>
                      )}
                    </div>

                    {/* TR1 Recording Link */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        TR1 Interview
                      </div>

                      {student.tr1?.interview_recording_link ? (
                        <>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                              <Video className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Recording Available</p>
                              <p className="text-xs text-gray-500">Click below to watch</p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              window.open(student.tr1.interview_recording_link, '_blank')
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-md"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            WATCH TR1
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <Video className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">No Recording</p>
                              <p className="text-xs text-gray-500">Not available</p>
                            </div>
                          </div>
                          <button
                            disabled
                            className="w-full px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg font-medium text-sm cursor-not-allowed border border-gray-200"
                          >
                            Unavailable
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Scores</h3>
                </div>

                {/* Tab Navigation - Centered with equal spacing */}
                {/* Tab Navigation - Pill Style */}
                <div className="flex justify-center mb-8">
                  <div className="bg-gray-100 p-1.5 rounded-xl inline-flex items-center gap-1 shadow-inner">
                    {[
                      { id: 'assessment', label: 'Overall Evaluation', icon: LayoutDashboard },
                      { id: 'tr1', label: 'TR1', icon: FileJson },
                      { id: 'tr2', label: 'TR2', icon: Server },
                      { id: 'remarks', label: 'Final Verdict', icon: Award },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDetailedScoresTab(tab.id as any)}
                        className={`px-4 py-2 font-medium text-sm transition-all rounded-lg flex items-center gap-2 ${detailedScoresTab === tab.id
                          ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                          }`}
                      >
                        <tab.icon className={`w-4 h-4 ${detailedScoresTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="mt-4">
                  <>
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
                          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                              <BarChart3 className="w-5 h-5 text-gray-600" />
                              <h5 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Assessment Scores</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Coding Card */}
                              {codingScore !== null && codingMax !== null && (
                                <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                      <Terminal className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                      {((codingScore / codingMax) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <h6 className="text-sm font-semibold text-gray-700 mb-1">Coding</h6>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{codingScore.toFixed(1)}</span>
                                    <span className="text-sm text-gray-500">/ {codingMax}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-blue-100 rounded-full mt-3 overflow-hidden">
                                    <div
                                      className="h-full bg-blue-600 rounded-full"
                                      style={{ width: `${Math.min(100, (codingScore / codingMax) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* DSA MCQ Card */}
                              {dsaScore !== null && dsaMax !== null && (
                                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                      <Brain className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                      {((dsaScore / dsaMax) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <h6 className="text-sm font-semibold text-gray-700 mb-1">DSA MCQ</h6>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{dsaScore}</span>
                                    <span className="text-sm text-gray-500">/ {dsaMax}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-indigo-100 rounded-full mt-3 overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-600 rounded-full"
                                      style={{ width: `${Math.min(100, (dsaScore / dsaMax) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* CS Fundamentals Card */}
                              {csScore !== null && csMax !== null && (
                                <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                      <BookOpen className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                      {((csScore / csMax) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <h6 className="text-sm font-semibold text-gray-700 mb-1">CS Fundamentals</h6>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{csScore}</span>
                                    <span className="text-sm text-gray-500">/ {csMax}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-emerald-100 rounded-full mt-3 overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-600 rounded-full"
                                      style={{ width: `${Math.min(100, (csScore / csMax) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Remarks Box */}
                          {verdict?.summary && (
                            <div>
                              <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                                <FileText className="w-5 h-5 text-gray-600" />Overall Remarks</h5>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <ul className="space-y-2">
                                  {verdict.summary.split('. ').filter(s => s.trim().length > 0).map((sentence, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                      <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                      <span>{sentence.trim()}{!sentence.trim().endsWith('.') ? '.' : ''}</span>
                                    </li>
                                  ))}
                                </ul>
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
                            <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                              <Calendar className="w-5 h-5 text-gray-600" />
                              Interview Date
                            </h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="text-sm text-gray-600">
                                {student.tr1.interview_date}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Problems Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Problem 1 */}
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex justify-between items-center">
                              <h5 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                <Code2 className="w-4 h-4 text-blue-600" />
                                Problem 1
                              </h5>
                              {(() => {
                                const codingProblem = (student.tr1?.coding_problem_asked as string) || ''
                                let urls: string[] = []
                                if (codingProblem) {
                                  const commaSplit = codingProblem.split(',').map(s => s.trim())
                                  if (commaSplit.length > 1) {
                                    urls = commaSplit.filter(s => s.startsWith('http'))
                                  } else {
                                    const spaceSplit = codingProblem.split(/\s+/)
                                    urls = spaceSplit.filter(s => s.startsWith('http'))
                                  }
                                  if (urls.length === 0 || urls.length < 2) {
                                    const urlRegex = /https?:\/\/[^\s,]+/g
                                    const regexMatches = codingProblem.match(urlRegex) || []
                                    if (regexMatches.length > 0) urls = regexMatches
                                  }
                                }
                                const p1Url = urls[0] || null

                                return p1Url ? (
                                  <button
                                    onClick={() => window.open(p1Url, '_blank')}
                                    className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors uppercase tracking-wider"
                                  >
                                    View Code
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                ) : null
                              })()}
                            </div>
                            <div className="p-5 space-y-5">
                              {student.tr1.problem_1?.problem_solving_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Problem Solving</span>
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                      {student.tr1.problem_1.problem_solving_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_1.problem_solving_rating)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.problem_1?.problem_solving_remarks && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                                  <span className="font-semibold text-gray-800 block mb-1">Remarks: </span>
                                  {student.tr1.problem_1.problem_solving_remarks}
                                </div>
                              )}
                              <div className="h-px bg-gray-100"></div>
                              {student.tr1.problem_1?.code_implementation_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Code Implementation</span>
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                      {student.tr1.problem_1.code_implementation_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_1.code_implementation_rating)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.problem_1?.code_implementation_remarks && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                                  <span className="font-semibold text-gray-800 block mb-1">Remarks: </span>
                                  {student.tr1.problem_1.code_implementation_remarks}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Problem 2 */}
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex justify-between items-center">
                              <h5 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                <Puzzle className="w-4 h-4 text-purple-600" />
                                Problem 2
                              </h5>
                              {(() => {
                                const codingProblem = (student.tr1?.coding_problem_asked as string) || ''
                                let urls: string[] = []
                                if (codingProblem) {
                                  const commaSplit = codingProblem.split(',').map(s => s.trim())
                                  if (commaSplit.length > 1) {
                                    urls = commaSplit.filter(s => s.startsWith('http'))
                                  } else {
                                    const spaceSplit = codingProblem.split(/\s+/)
                                    urls = spaceSplit.filter(s => s.startsWith('http'))
                                  }
                                  if (urls.length === 0 || urls.length < 2) {
                                    const urlRegex = /https?:\/\/[^\s,]+/g
                                    const regexMatches = codingProblem.match(urlRegex) || []
                                    if (regexMatches.length > 0) urls = regexMatches
                                  }
                                }
                                const p2Url = urls[1] || null

                                return p2Url ? (
                                  <button
                                    onClick={() => window.open(p2Url, '_blank')}
                                    className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors uppercase tracking-wider"
                                  >
                                    View Code
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                ) : null
                              })()}
                            </div>
                            <div className="p-5 space-y-5">
                              {student.tr1.problem_2?.problem_solving_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Problem Solving</span>
                                    <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                      {student.tr1.problem_2.problem_solving_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-purple-500 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_2.problem_solving_rating)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.problem_2?.problem_solving_remarks && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                                  <span className="font-semibold text-gray-800 block mb-1">Remarks: </span>
                                  {student.tr1.problem_2.problem_solving_remarks}
                                </div>
                              )}
                              <div className="h-px bg-gray-100"></div>
                              {student.tr1.problem_2?.code_implementation_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Code Implementation</span>
                                    <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                      {student.tr1.problem_2.code_implementation_rating} / 5
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-purple-500 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.problem_2.code_implementation_rating)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.problem_2?.code_implementation_remarks && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                                  <span className="font-semibold text-gray-800 block mb-1">Remarks: </span>
                                  {student.tr1.problem_2.code_implementation_remarks}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Theory Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* DSA Theory */}
                          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-2 bg-indigo-100 rounded-lg">
                                <GitBranch className="w-5 h-5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                {((parseFloat(String(student.tr1.dsa_theory)) / 5) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-gray-900 mb-1">DSA Theory</h5>
                            <div className="space-y-4">
                              {student.tr1.dsa_theory !== undefined && (
                                <div>
                                  <div className="flex items-baseline gap-1 mb-3">
                                    <span className="text-2xl font-bold text-gray-900">{student.tr1.dsa_theory}</span>
                                    <span className="text-sm text-gray-500">/ 5</span>
                                  </div>
                                  <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-500 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.dsa_theory)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.remarks_on_dsa_theory && (
                                <div className="bg-white/60 rounded-lg p-3 text-sm text-gray-600 border border-indigo-50">
                                  <span className="font-semibold text-gray-800 block mb-1">Remarks: </span>
                                  {student.tr1.remarks_on_dsa_theory}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Core CS Theory */}
                          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-2 bg-emerald-100 rounded-lg">
                                <Library className="w-5 h-5 text-emerald-600" />
                              </div>
                              <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                {((parseFloat(String(student.tr1.core_cs_theory)) / 5) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-gray-900 mb-1">Core CS Theory</h5>
                            <div className="space-y-4">
                              {student.tr1.core_cs_theory !== undefined && (
                                <div>
                                  <div className="flex items-baseline gap-1 mb-3">
                                    <span className="text-2xl font-bold text-gray-900">{student.tr1.core_cs_theory}</span>
                                    <span className="text-sm text-gray-500">/ 5</span>
                                  </div>
                                  <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full"
                                      style={{ width: `${(parseFloat(String(student.tr1.core_cs_theory)) / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr1.remarks_on_core_cs_theory && (
                                <div className="bg-white/60 rounded-lg p-3 text-sm text-gray-600 border border-emerald-50">
                                  <span className="font-semibold text-gray-800 block mb-1">Remarks: </span>
                                  {student.tr1.remarks_on_core_cs_theory}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Overall Comments */}
                        {student.tr1.overall_comments && (
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
                              <ClipboardListIcon className="w-4 h-4 text-blue-600" />
                              <h5 className="text-sm font-bold text-gray-800">Overall Comments</h5>
                            </div>
                            <div className="p-5">
                              <div className="bg-blue-50/50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-blue-100/50">
                                {student.tr1.overall_comments}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Total Score */}
                        {student.tr1.total_score !== undefined && (
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="flex items-center gap-2 text-sm font-medium text-blue-100 mb-1">
                                  <TargetIcon className="w-5 h-5" />Total TR1 Score
                                </h5>
                                <div className="text-3xl font-bold">
                                  {student.tr1.total_score} <span className="text-xl text-blue-200">/ 100</span>
                                </div>
                              </div>
                              <div className="w-32 h-32 relative hidden md:block">
                                {/* Placeholder for a circular chart or graphic if needed, reusing simple progress for now */}
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.2)"
                                    strokeWidth="3"
                                  />
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="3"
                                    strokeDasharray={`${Math.min(100, parseFloat(String(student.tr1.total_score)))}, 100`}
                                  />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold">
                                  {student.tr1.total_score}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* DSA CD Team Remarks */}
                        {student.tr1.dsa_cd_team_remarks && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                            <h5 className="text-sm font-bold text-gray-900 mb-2">DSA CD Team Remarks</h5>
                            <p className="text-sm text-gray-700">{student.tr1.dsa_cd_team_remarks}</p>
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
                            <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                              <Calendar className="w-5 h-5 text-gray-600" />Interview Date</h5>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="text-sm text-gray-600">
                                {student.tr2.interview_date}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Soft Skills & Project Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Soft Skills */}
                          <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-2 bg-pink-100 rounded-lg">
                                <HeartHandshake className="w-5 h-5 text-pink-600" />
                              </div>
                              {student.tr2.soft_skills?.communication !== undefined && (
                                <span className="text-xs font-bold px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                                  {Math.min(100, parseFloat(String(student.tr2.soft_skills.communication)))}%
                                </span>
                              )}
                            </div>
                            <h5 className="text-sm font-bold text-gray-900 mb-4">Soft Skills</h5>
                            <div className="space-y-4">
                              {student.tr2.soft_skills?.communication !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Communication</span>
                                    <span className="text-sm font-bold text-pink-600">{student.tr2.soft_skills.communication}</span>
                                  </div>
                                  <div className="w-full h-2 bg-pink-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-pink-500 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.soft_skills.communication)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {student.tr2.soft_skills?.presentability && (
                                <div className="bg-white/60 rounded-lg p-3 text-sm text-gray-600 border border-pink-50">
                                  <span className="font-semibold text-gray-800 block mb-1">Presentability: </span>
                                  {student.tr2.soft_skills.presentability}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Project */}
                          <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <FolderKanban className="w-5 h-5 text-orange-600" />
                              </div>
                              {student.tr2.projects?.project_rating !== undefined && (
                                <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                  {Math.min(100, parseFloat(String(student.tr2.projects.project_rating)))}%
                                </span>
                              )}
                            </div>
                            <h5 className="text-sm font-bold text-gray-900 mb-4">Project Evaluation</h5>
                            <div className="space-y-4">
                              {student.tr2.projects?.project_rating !== undefined && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Rating</span>
                                    <span className="text-sm font-bold text-orange-600">{student.tr2.projects.project_rating}</span>
                                  </div>
                                  <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-orange-500 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.projects.project_rating)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-3">
                                {student.tr2.projects?.projects_type && (
                                  <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                    <span>Type: <span className="text-gray-900 font-semibold">{student.tr2.projects.projects_type}</span></span>
                                  </div>
                                )}
                                {student.tr2.projects?.projects_explanation && (
                                  <div className="bg-white/60 rounded-lg p-3 text-sm text-gray-600 border border-orange-50">
                                    <span className="font-semibold text-gray-800 block mb-1">Explanation: </span>
                                    {student.tr2.projects.projects_explanation}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Technical Scores Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Frontend */}
                          <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-2 bg-cyan-100 rounded-lg">
                                <Layout className="w-5 h-5 text-cyan-600" />
                              </div>
                              {student.tr2.frontend?.frontend_score !== undefined && (
                                <span className="text-xs font-bold px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full">
                                  {Math.min(100, parseFloat(String(student.tr2.frontend.frontend_score)))}%
                                </span>
                              )}
                            </div>
                            <h5 className="text-sm font-bold text-gray-900 mb-4">Frontend Development</h5>
                            <div className="space-y-4">
                              {student.tr2.frontend?.frontend_score !== undefined && (
                                <div className="mb-4">
                                  <div className="w-full h-2 bg-cyan-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-cyan-500 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.frontend.frontend_score)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              <div className="space-y-4">
                                {student.tr2.frontend?.html_css_js_theory && (
                                  <div className="bg-white/60 p-3 rounded-lg text-sm border border-cyan-50 shadow-sm">
                                    <div className="font-bold text-cyan-800 text-[10px] uppercase mb-1 tracking-wider">HTML/CSS/JS Logic</div>
                                    <div className="text-gray-700 leading-relaxed italic">&ldquo;{student.tr2.frontend.html_css_js_theory}&rdquo;</div>
                                  </div>
                                )}
                                {student.tr2.frontend?.react_architecture && (
                                  <div className="bg-white/60 p-3 rounded-lg text-sm border border-cyan-50 shadow-sm">
                                    <div className="font-bold text-cyan-800 text-[10px] uppercase mb-1 tracking-wider">React Architecture</div>
                                    <div className="text-gray-700 leading-relaxed italic">&ldquo;{student.tr2.frontend.react_architecture}&rdquo;</div>
                                  </div>
                                )}
                                {student.tr2.frontend?.react_coding && (
                                  <div className="bg-slate-900 p-4 rounded-xl text-[11px] font-mono text-cyan-400 overflow-x-auto border border-slate-800 shadow-lg">
                                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-2 border-b border-slate-800 pb-1">Snippet Verification</div>
                                    <div className="whitespace-pre-wrap">{student.tr2.frontend.react_coding}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Backend */}
                          <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-2 bg-violet-100 rounded-lg">
                                <ServerCog className="w-5 h-5 text-violet-600" />
                              </div>
                              {student.tr2.backend?.backend_score !== undefined && (
                                <span className="text-xs font-bold px-2 py-1 bg-violet-100 text-violet-700 rounded-full">
                                  {Math.min(100, parseFloat(String(student.tr2.backend.backend_score)))}%
                                </span>
                              )}
                            </div>
                            <h5 className="text-sm font-bold text-gray-900 mb-4">Backend Development</h5>
                            <div className="space-y-4">
                              {student.tr2.backend?.backend_score !== undefined && (
                                <div className="mb-4">
                                  <div className="w-full h-2 bg-violet-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-violet-500 rounded-full"
                                      style={{ width: `${Math.min(100, parseFloat(String(student.tr2.backend.backend_score)))}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-2">
                                {student.tr2.backend?.node_express_theory && (
                                  <div className="bg-white/60 p-3 rounded-lg text-sm border border-violet-50">
                                    <div className="font-bold text-violet-800 text-[10px] uppercase mb-1">Node/Express</div>
                                    <div className="text-gray-600 italic leading-relaxed">{student.tr2.backend.node_express_theory}</div>
                                  </div>
                                )}
                                {student.tr2.backend?.mongodb_theory && (
                                  <div className="bg-white/60 p-3 rounded-lg text-sm border border-violet-50">
                                    <div className="font-bold text-violet-800 text-[10px] uppercase mb-1">MongoDB</div>
                                    <div className="text-gray-600 italic leading-relaxed">{student.tr2.backend.mongodb_theory}</div>
                                  </div>
                                )}
                                {student.tr2.backend?.backend_endpoint && (
                                  <div className="bg-slate-900 p-4 rounded-xl text-[11px] font-mono text-violet-300 overflow-x-auto border border-slate-800 shadow-lg mt-2">
                                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-2 border-b border-slate-800 pb-1">API Lifecycle Logic</div>
                                    <div className="whitespace-pre-wrap">{student.tr2.backend.backend_endpoint}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Internship */}
                        <div className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                              <LucideGraduationCap className="w-5 h-5 text-yellow-600" />
                            </div>
                            {student.tr2.experience?.internship_score !== undefined && (
                              <span className="text-xs font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                                {Math.min(100, parseFloat(String(student.tr2.experience.internship_score)))}%
                              </span>
                            )}
                          </div>
                          <h5 className="text-sm font-bold text-gray-900 mb-4">Internship & Experience</h5>
                          <div className="space-y-4">
                            {student.tr2.experience?.internship_score !== undefined && (
                              <div className="mb-4">
                                <div className="w-full h-2 bg-yellow-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-500 rounded-full"
                                    style={{ width: `${Math.min(100, parseFloat(String(student.tr2.experience.internship_score)))}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              {student.tr2.experience?.cs_fundamentals && (
                                <div className="bg-white/60 p-3 rounded-lg text-sm border border-yellow-50">
                                  <span className="font-bold text-yellow-800 text-[10px] uppercase block mb-1">CS Fundamentals</span>
                                  <p className="text-gray-600 text-xs italic">{student.tr2.experience.cs_fundamentals}</p>
                                </div>
                              )}
                              {student.tr2.experience?.scenario_based_questions && (
                                <div className="bg-white/60 p-3 rounded-lg text-sm border border-yellow-50">
                                  <span className="font-bold text-yellow-800 text-[10px] uppercase block mb-1">Scenarios</span>
                                  <p className="text-gray-600 text-xs italic">{student.tr2.experience.scenario_based_questions}</p>
                                </div>
                              )}
                              {student.tr2.experience?.internships_experience && (
                                <div className="bg-white/60 p-3 rounded-lg text-sm border border-yellow-50 col-span-full">
                                  <span className="font-bold text-yellow-800 text-[10px] uppercase block mb-1">Internship Context</span>
                                  <p className="text-gray-600 text-xs italic">{student.tr2.experience.internships_experience}</p>
                                </div>
                              )}
                              {student.tr2.experience?.internship_explanation && (
                                <div className="bg-white/60 p-3 rounded-lg text-sm border border-yellow-50 col-span-full">
                                  <span className="font-bold text-yellow-800 text-[10px] uppercase block mb-1">Key Contributions</span>
                                  <p className="text-gray-600 text-xs italic">{student.tr2.experience.internship_explanation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* AI Knowledge */}
                        {student.tr2.ai_knowledge && (
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-purple-50 border-b border-purple-100 px-5 py-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              <h5 className="text-sm font-bold text-purple-900">AI Knowledge & Adaptation</h5>
                            </div>
                            <div className="p-5">
                              <div className="bg-purple-50/30 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-purple-100/50 italic">
                                &ldquo;{student.tr2.ai_knowledge}&rdquo;
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overall Score */}
                        {student.tr2.overall_score !== undefined && (
                          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="flex items-center gap-2 text-sm font-medium text-violet-100 mb-1">
                                  <Target className="w-5 h-5" />TR2 Overall Score
                                </h5>
                                <div className="text-3xl font-bold">
                                  {student.tr2.overall_score} <span className="text-xl text-violet-200">/ 100</span>
                                </div>
                              </div>
                              <div className="w-32 h-32 relative hidden md:block">
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.2)"
                                    strokeWidth="3"
                                  />
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="3"
                                    strokeDasharray={`${Math.min(100, parseFloat(String(student.tr2.overall_score)))}, 100`}
                                  />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold">
                                  {student.tr2.overall_score}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overall Remarks */}
                        {student.tr2.overall_remarks && (
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h5 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                              <ClipboardList className="w-4 h-4 text-violet-600" />Overall Remarks
                            </h5>
                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed border border-gray-200">
                              {student.tr2.overall_remarks}
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
                          <div className="bg-green-50/80 border border-green-200 rounded-xl p-6 shadow-sm">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-green-800 mb-4 uppercase tracking-wide">
                              <Shield className="w-4 h-4" />Technical Strengths</h4>
                            <ul className="grid grid-cols-1 gap-3 pl-1">
                              {verdict.strengths.map((strength, idx) => (
                                <li key={idx} className="text-sm text-gray-800 flex items-start gap-2.5">
                                  <div className="min-w-[4px] h-[4px] rounded-full bg-green-500 mt-2"></div>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Development Areas */}
                        {verdict.improvements && verdict.improvements.length > 0 && (
                          <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-6 shadow-sm">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-orange-800 mb-4 uppercase tracking-wide">
                              <Wrench className="w-4 h-4" />Development Areas</h4>
                            <ul className="grid grid-cols-1 gap-3 pl-1">
                              {verdict.improvements.map((improvement, idx) => (
                                <li key={idx} className="text-sm text-gray-800 flex items-start gap-2.5">
                                  <div className="min-w-[4px] h-[4px] rounded-full bg-orange-500 mt-2"></div>
                                  <span>{improvement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Role Fit */}
                        {verdict.recommended_role_fit && (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                              <UserCheck className="w-24 h-24 text-blue-900" />
                            </div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-4 uppercase tracking-wide">
                              <UserCheck className="w-5 h-5" />Recommended Role Fit</h4>
                            <div className="bg-white/60 rounded-xl p-5 border border-white/80 shadow-inner">
                              <p className="text-base text-gray-800 leading-relaxed font-medium">
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
                                    result += `<strong class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded mx-0.5 border border-blue-200/50">${text.substring(range.start, range.end)}</strong>`
                                    lastIndex = range.end
                                  })
                                  result += text.substring(lastIndex)

                                  return <span dangerouslySetInnerHTML={{ __html: result }} />
                                })()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
