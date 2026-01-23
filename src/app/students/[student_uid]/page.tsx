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
  Play,
  DollarSign
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
  // New fields
  assessment_remarks?: string
  tr1_remarks?: string
  tr2_overall_remarks?: string
  technical_strengths?: string[]
  development_areas?: string[]
  recommended_role_fit?: string
  why_this_candidate?: string[]
  role_fit?: string[]
  overall_summary?: string
  recommendation?: 'Strong Hire' | 'Hire' | 'Weak Hire'
  generated_at?: Date | string
  model?: string
  // Legacy fields for backward compatibility
  summary?: string
  strengths?: string[]
  improvements?: string[]
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
  const [generatingVerdict, setGeneratingVerdict] = useState(false)
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
      const response = await fetch(`/api/students/${student_uid}/verdict`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
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
    } catch (error: any) {
      console.error('Error fetching verdict:', error)
      // Don't set verdict to null if it's just a network error - might be temporary
      if (error.message && error.message.includes('Failed to fetch')) {
        console.warn('Network error fetching verdict, will retry on next attempt')
      } else {
        setVerdict(null)
      }
    }
  }

  const generateVerdict = async () => {
    setGeneratingVerdict(true)
    try {
      const response = await fetch(`/api/students/${student_uid}/verdict/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.status === 'ok' && data.data) {
        setVerdict(data.data)
      } else {
        console.warn('Verdict generation returned non-ok status:', data)
        // If generation failed, try fetching again after a short delay
        setTimeout(() => {
          fetchVerdict()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error generating verdict:', error)
      // Only retry if it's not a network error that suggests the endpoint doesn't exist
      if (error.message && !error.message.includes('Failed to fetch')) {
        setTimeout(() => {
          fetchVerdict()
        }, 2000)
      }
    } finally {
      setGeneratingVerdict(false)
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
                      {recommendation === 'Strong Hire' ? 'STRONG' :
                        recommendation === 'Hire' ? 'MEDIUM' :
                          recommendation === 'Weak Hire' ? 'LOW' :
                            recommendation.toUpperCase()}
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

                  // Calculate percentages for circular progress
                  const dsaPercentage = dsaScore !== null && dsaSection !== null && dsaSection > 0 
                    ? Math.round((dsaScore / dsaSection) * 100) 
                    : null
                  const codingPercentage = codingScore !== null && codingSection !== null && codingSection > 0 
                    ? Math.round((codingScore / codingSection) * 100) 
                    : null
                  const csPercentage = csFundamentalsScore !== null && csFundamentalsSection !== null && csFundamentalsSection > 0 
                    ? Math.round((csFundamentalsScore / csFundamentalsSection) * 100) 
                    : null

                  // Circular progress component
                  const CircularProgress = ({ percentage, size = 80 }: { percentage: number | null, size?: number }) => {
                    if (percentage === null) return <div className="text-2xl font-bold text-gray-400">N/A</div>
                    const radius = (size - 8) / 2
                    const circumference = 2 * Math.PI * radius
                    const offset = circumference - (percentage / 100) * circumference
                    
                    return (
                      <div className="relative" style={{ width: size, height: size }}>
                        <svg className="transform -rotate-90" width={size} height={size}>
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="text-blue-600 transition-all duration-300"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-600">{percentage}</span>
                        </div>
                      </div>
                    )
                  }

                  // Star rating component
                  const StarRating = ({ rating }: { rating: number | null }) => {
                    if (rating === null) return <div className="text-2xl font-bold text-gray-400">N/A</div>
                    const fullStars = Math.floor(rating)
                    const hasHalfStar = rating % 1 >= 0.5
                    
                    return (
                      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100px' }}>
                        <div className="flex gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-6 h-6 ${star <= fullStars ? 'text-yellow-400 fill-current' : star === fullStars + 1 && hasHalfStar ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-lg font-bold text-orange-500">{rating}/5</span>
                      </div>
                    )
                  }

                  return (
                    <>
                      {/* DSA */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center">
                        <CircularProgress percentage={dsaPercentage} size={100} />
                        <div className="mt-4 text-center">
                          <div className="text-base font-bold text-gray-900">DSA</div>
                        </div>
                      </div>

                      {/* Coding Speed */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center">
                        <CircularProgress percentage={codingPercentage} size={100} />
                        <div className="mt-4 text-center">
                          <div className="text-base font-bold text-gray-900">Coding Speed</div>
                        </div>
                      </div>

                      {/* CS Fundamentals */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center">
                        <CircularProgress percentage={csPercentage} size={100} />
                        <div className="mt-4 text-center">
                          <div className="text-base font-bold text-gray-900">CS Fundamentals</div>
                        </div>
                      </div>

                      {/* Communication */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center">
                        <StarRating rating={communication} />
                        <div className="mt-4 text-center">
                          <div className="text-base font-bold text-gray-900">Communication</div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Overall Summary */}
              {(verdict?.overall_summary || verdict?.summary) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
                  </div>
                  
                  {/* Blue Bordered Box with 3 Sections */}
                  <div className="border-2 border-blue-500 rounded-lg overflow-hidden">
                    {/* Section 1: Overall Summary */}
                    <div className="p-4 border-b-2 border-blue-500">
                      <ul className="space-y-2">
                        {(verdict.overall_summary || verdict.summary || '').split('. ').filter(s => s.trim().length > 0).map((sentence, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <span>{sentence.trim()}{!sentence.trim().endsWith('.') ? '.' : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Section 2: Best Fit Roles */}
                    <div className="p-4 border-b-2 border-blue-500">
                      <div className="space-y-4">
                        {/* Best Fit Roles */}
                        {verdict.role_fit && verdict.role_fit.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="w-5 h-5 text-gray-600" />
                              <h4 className="text-base font-semibold text-gray-900">BEST FIT ROLES</h4>
                            </div>
                            <p className="text-sm text-gray-700 ml-7">
                              {verdict.role_fit.slice(0, 3).join(' · ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Why This Candidate (with blue shading) */}
                    {verdict.why_this_candidate && verdict.why_this_candidate.length > 0 && (
                      <div className="p-4 bg-blue-50">
                        <h4 className="text-base font-bold text-blue-900 mb-3">Why This Candidate?</h4>
                        <ul className="space-y-2">
                          {verdict.why_this_candidate.map((point, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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

                  {/* Second Row: LeetCode Problem 1 and Problem 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LeetCode Problem 1 */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        LeetCode Problem 1
                      </div>

                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <Code2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Problem Solution</p>
                          <p className="text-xs text-gray-500">View code implementation</p>
                        </div>
                      </div>

                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-sm"
                      >
                        <Code2 className="w-4 h-4 text-blue-600" />
                        VIEW CODE
                      </button>
                    </div>

                    {/* LeetCode Problem 2 */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        LeetCode Problem 2
                      </div>

                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <Code2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Problem Solution</p>
                          <p className="text-xs text-gray-500">View code implementation</p>
                        </div>
                      </div>

                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-sm"
                      >
                        <Code2 className="w-4 h-4 text-blue-600" />
                        VIEW CODE
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Scores</h3>
                </div>

                {/* Tab Navigation - Full Width with equal spacing */}
                <div className="mb-8">
                  <div className="bg-gray-100 p-1.5 rounded-xl flex items-center gap-1 shadow-inner">
                    {[
                      { id: 'assessment', label: 'Assessment', icon: LayoutDashboard },
                      { id: 'tr1', label: 'Interview 1: DSA', icon: FileJson },
                      { id: 'tr2', label: 'Interview 2: Projects', icon: Server },
                      { id: 'remarks', label: 'Final Verdict', icon: Award },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDetailedScoresTab(tab.id as any)}
                        className={`flex-1 px-4 py-2 font-medium text-sm transition-all rounded-lg flex items-center justify-center gap-2 ${detailedScoresTab === tab.id
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
                            
                            {/* Table Format */}
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr>
                                    <th className="text-left py-3 px-4 font-bold text-gray-900">Assessment</th>
                                    <th className="text-left py-3 px-4 font-bold text-gray-900">Score</th>
                                  </tr>
                                  <tr>
                                    <td colSpan={2} className="p-0">
                                      <div className="h-0.5 bg-blue-500"></div>
                                    </td>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Coding Row */}
                                  {codingScore !== null && codingMax !== null && (
                                    <>
                                      <tr>
                                        <td className="py-3 px-4 text-gray-900">Coding</td>
                                        <td className="py-3 px-4">
                                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-md font-medium">
                                            {codingScore.toFixed(1)}/{codingMax}
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colSpan={2} className="p-0">
                                          <div className="h-px bg-gray-200"></div>
                                        </td>
                                      </tr>
                                    </>
                                  )}

                                  {/* DSA MCQ Row */}
                                  {dsaScore !== null && dsaMax !== null && (
                                    <>
                                      <tr>
                                        <td className="py-3 px-4 text-gray-900">DSA MCQ</td>
                                        <td className="py-3 px-4">
                                          <span className="inline-block px-3 py-1 bg-orange-50 text-orange-600 rounded-md font-medium">
                                            {dsaScore}/{dsaMax}
                                          </span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colSpan={2} className="p-0">
                                          <div className="h-px bg-gray-200"></div>
                                        </td>
                                      </tr>
                                    </>
                                  )}

                                  {/* CS Fundamentals Row */}
                                  {csScore !== null && csMax !== null && (
                                    <>
                                      <tr>
                                        <td className="py-3 px-4 text-gray-900">CS Fundamentals</td>
                                        <td className="py-3 px-4">
                                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-md font-medium">
                                            {csScore}/{csMax}
                                          </span>
                                        </td>
                                      </tr>
                                    </>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Assessment Remarks */}
                          {verdict?.assessment_remarks && (
                            <div>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {verdict.assessment_remarks}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* TR1 Tab */}
                    {detailedScoresTab === 'tr1' && student.tr1 && Object.keys(student.tr1).length > 0 && (
                      <div className="space-y-4">
                        {/* TR1 Visualization */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                          <h5 className="text-base font-bold text-gray-900 mb-4">DSA Interview</h5>
                          <div className="space-y-4">
                            {/* Problem Solving Rating */}
                            {(() => {
                              const p1Rating = student.tr1.problem_1?.problem_solving_rating
                              const p2Rating = student.tr1.problem_2?.problem_solving_rating
                              let avgRating = 0
                              if (p1Rating !== undefined && p2Rating !== undefined) {
                                avgRating = (parseFloat(String(p1Rating)) + parseFloat(String(p2Rating))) / 2
                              } else if (p1Rating !== undefined) {
                                avgRating = parseFloat(String(p1Rating))
                              } else if (p2Rating !== undefined) {
                                avgRating = parseFloat(String(p2Rating))
                              }
                              if (isNaN(avgRating)) avgRating = 0
                              return (
                                <div>
                                  <div className="text-sm text-gray-900 mb-2"><b>Problem Solving</b></div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${(avgRating / 5) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[40px]">{avgRating.toFixed(1)}/5</span>
                                  </div>
                                </div>
                              )
                            })()}

                            {/* Code Implementation Rating */}
                            {(() => {
                              const p1Rating = student.tr1.problem_1?.code_implementation_rating
                              const p2Rating = student.tr1.problem_2?.code_implementation_rating
                              let avgRating = 0
                              if (p1Rating !== undefined && p2Rating !== undefined) {
                                avgRating = (parseFloat(String(p1Rating)) + parseFloat(String(p2Rating))) / 2
                              } else if (p1Rating !== undefined) {
                                avgRating = parseFloat(String(p1Rating))
                              } else if (p2Rating !== undefined) {
                                avgRating = parseFloat(String(p2Rating))
                              }
                              if (isNaN(avgRating)) avgRating = 0
                              return (
                                <div>
                                  <div className="text-sm text-gray-900 mb-2"><b>Code Quality</b></div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${(avgRating / 5) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[40px]">{avgRating.toFixed(1)}/5</span>
                                  </div>
                                </div>
                              )
                            })()}

                            {/* DSA Theory */}
                            <div>
                              <div className="text-sm text-gray-900 mb-2"><b>DSA Theory</b></div>
                              {(() => {
                                const dsaValue = student.tr1.dsa_theory !== undefined ? parseFloat(String(student.tr1.dsa_theory)) : 0
                                const displayValue = isNaN(dsaValue) ? 0 : dsaValue
                                return (
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${(displayValue / 5) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[40px]">{displayValue}/5</span>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* CS Theory */}
                            <div>
                              <div className="text-sm text-gray-900 mb-2"><b>CS Fundamentals</b></div>
                              {(() => {
                                const csValue = student.tr1.core_cs_theory !== undefined ? parseFloat(String(student.tr1.core_cs_theory)) : 0
                                const displayValue = isNaN(csValue) ? 0 : csValue
                                return (
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${(displayValue / 5) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[40px]">{displayValue}/5</span>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Overall Comments */}
                        {(verdict?.tr1_remarks || student.tr1.overall_comments) && (
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
                              <ClipboardListIcon className="w-4 h-4 text-blue-600" />
                              <h5 className="text-sm font-bold text-gray-800">Overall Comments</h5>
                            </div>
                            <div className="p-5">
                              <div className="bg-blue-50/50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-blue-100/50">
                                {verdict?.tr1_remarks || student.tr1.overall_comments}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TR2 Tab */}
                    {detailedScoresTab === 'tr2' && student.tr2 && Object.keys(student.tr2).length > 0 && (
                      <div className="space-y-4">
                        {/* TR2 Visualization */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                          <h5 className="text-base font-bold text-gray-900 mb-4">TR2 Interview</h5>
                          <div className="space-y-4">
                            {/* Communication */}
                            <div>
                              <div className="text-sm text-gray-900 mb-2"><b>Coomunication Project Rating</b></div>
                              {(() => {
                                const projectValue = student.tr2.projects?.communication_project_rating !== undefined ? parseFloat(String(student.tr2.projects.communication_project_rating)) : 0
                                const displayValue = isNaN(projectValue) ? 0 : Math.min(100, projectValue)
                                return (
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${displayValue}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[50px]">{Math.round(displayValue)}/100</span>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Project Rating */}
                            <div>
                              <div className="text-sm text-gray-900 mb-2"><b>Project Rating</b></div>
                              {(() => {
                                const projectValue = student.tr2.projects?.project_rating !== undefined ? parseFloat(String(student.tr2.projects.project_rating)) : 0
                                const displayValue = isNaN(projectValue) ? 0 : Math.min(100, projectValue)
                                return (
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${displayValue}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[50px]">{Math.round(displayValue)}/100</span>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Frontend Score */}
                            <div>
                              <div className="text-sm text-gray-900 mb-2"><b>Frontend Score</b></div>
                              {(() => {
                                const frontendValue = student.tr2.frontend?.frontend_score !== undefined ? parseFloat(String(student.tr2.frontend.frontend_score)) : 0
                                const displayValue = isNaN(frontendValue) ? 0 : Math.min(100, frontendValue)
                                return (
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${displayValue}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[50px]">{Math.round(displayValue)}/100</span>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Backend Score */}
                            <div>
                              <div className="text-sm text-gray-900 mb-2"><b>Backend Score</b></div>
                              {(() => {
                                const backendValue = student.tr2.backend?.backend_score !== undefined ? parseFloat(String(student.tr2.backend.backend_score)) : 0
                                const displayValue = isNaN(backendValue) ? 0 : Math.min(100, backendValue)
                                return (
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${displayValue}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[50px]">{Math.round(displayValue)}/100</span>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Internship Score */}
                            <div>
                              <div className="text-sm text-gray-900 mb-2"><b>Internship Score</b></div>
                              {(() => {
                                const internshipValue = student.tr2.experience?.internship_score !== undefined ? parseFloat(String(student.tr2.experience.internship_score)) : 0
                                const displayValue = isNaN(internshipValue) ? 0 : Math.min(100, internshipValue)
                                return (
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: `${displayValue}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[50px]">{Math.round(displayValue)}/100</span>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Overall Comments */}
                        {(verdict?.tr2_overall_remarks || student.tr2.overall_comments) && (
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
                              <ClipboardListIcon className="w-4 h-4 text-blue-600" />
                              <h5 className="text-sm font-bold text-gray-800">Overall Comments</h5>
                            </div>
                            <div className="p-5">
                              <div className="bg-blue-50/50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-blue-100/50">
                                {verdict?.tr2_overall_remarks || student.tr2.overall_comments}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overall Remarks */}
                        {/* {student.tr2.overall_remarks && (
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h5 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                              <ClipboardList className="w-4 h-4 text-violet-600" />Overall Remarks
                            </h5>
                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed border border-gray-200">
                              {student.tr2.overall_remarks}
                            </div>
                          </div>
                        )} */}
                      </div>
                    )}

                    {/* Remarks Tab (Final Verdict) */}
                    {detailedScoresTab === 'remarks' && verdict && (
                      <div className="space-y-4">
                        {/* Technical Strengths */}
                        {(verdict.technical_strengths && verdict.technical_strengths.length > 0) || (verdict.strengths && verdict.strengths.length > 0) ? (
                          <div className="bg-green-50/80 border border-green-200 rounded-xl p-6 shadow-sm">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-green-800 mb-4 uppercase tracking-wide">
                              <Shield className="w-4 h-4" />Technical Strengths</h4>
                            <ul className="grid grid-cols-1 gap-3 pl-1">
                              {(verdict.technical_strengths || verdict.strengths || []).map((strength, idx) => (
                                <li key={idx} className="text-sm text-gray-800 flex items-start gap-2.5">
                                  <div className="min-w-[4px] h-[4px] rounded-full bg-green-500 mt-2"></div>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* Development Areas */}
                        {(verdict.development_areas && verdict.development_areas.length > 0) || (verdict.improvements && verdict.improvements.length > 0) ? (
                          <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-6 shadow-sm">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-orange-800 mb-4 uppercase tracking-wide">
                              <Wrench className="w-4 h-4" />Development Areas</h4>
                            <ul className="grid grid-cols-1 gap-3 pl-1">
                              {(verdict.development_areas || verdict.improvements || []).map((improvement, idx) => (
                                <li key={idx} className="text-sm text-gray-800 flex items-start gap-2.5">
                                  <div className="min-w-[4px] h-[4px] rounded-full bg-orange-500 mt-2"></div>
                                  <span>{improvement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

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
