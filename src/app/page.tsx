'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
  student_uid: string
  basic_info: {
    name: string
    university: string
    college_name?: string
  }
  assessment_score?: string | number | null
  tr1_score?: string | number | null
  tr2_score?: string | number | null
  final_verdict?: string | null
  evaluation_scores?: {
    coding?: string | number | null
    dsa?: string | number | null
    'cs fundamentals'?: string | number | null
    quantitative?: string | number | null
    logical?: string | number | null
    verbal?: string | number | null
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function Dashboard() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  })
  const [colleges, setColleges] = useState<string[]>([])
  const [availableEvaluations, setAvailableEvaluations] = useState<string[]>([])
  const [availableInterviews, setAvailableInterviews] = useState<string[]>([])
  const [availableVerdicts, setAvailableVerdicts] = useState<string[]>([])

  // Search states
  const [nameUidSearch, setNameUidSearch] = useState('')
  const [collegeSearch, setCollegeSearch] = useState('')
  const [evaluationSearch, setEvaluationSearch] = useState('')
  const [interviewSearch, setInterviewSearch] = useState('')
  const [verdictSearch, setVerdictSearch] = useState('')

  // Debounced search values (300ms delay)
  const debouncedNameUidSearch = useDebounce(nameUidSearch, 300)
  const debouncedCollegeSearch = useDebounce(collegeSearch, 300)
  const debouncedEvaluationSearch = useDebounce(evaluationSearch, 300)
  const debouncedInterviewSearch = useDebounce(interviewSearch, 300)
  const debouncedVerdictSearch = useDebounce(verdictSearch, 300)

  const fetchStudents = async (page: number = 1, limit: number = pagination.limit) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (debouncedNameUidSearch) {
        params.append('search', debouncedNameUidSearch)
      }
      if (debouncedCollegeSearch) {
        params.append('college', debouncedCollegeSearch)
      }
      if (debouncedEvaluationSearch) {
        params.append('evaluation', debouncedEvaluationSearch)
      }
      if (debouncedInterviewSearch) {
        params.append('interview', debouncedInterviewSearch)
      }
      if (debouncedVerdictSearch) {
        params.append('verdict', debouncedVerdictSearch)
      }

      const response = await fetch(`/api/students?${params}`)
      const data = await response.json()

      if (data.status === 'ok') {
        setStudents(data.data)
        setPagination(data.pagination)
        if (data.colleges) {
          setColleges(data.colleges)
        }
        if (data.availableEvaluations) {
          setAvailableEvaluations(data.availableEvaluations)
        }
        if (data.availableInterviews) {
          setAvailableInterviews(data.availableInterviews)
        }
        if (data.availableVerdicts) {
          setAvailableVerdicts(data.availableVerdicts)
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (debouncedNameUidSearch) {
        params.append('search', debouncedNameUidSearch)
      }
      if (debouncedCollegeSearch) {
        params.append('college', debouncedCollegeSearch)
      }
      if (debouncedEvaluationSearch) {
        params.append('evaluation', debouncedEvaluationSearch)
      }
      if (debouncedInterviewSearch) {
        params.append('interview', debouncedInterviewSearch)
      }
      if (debouncedVerdictSearch) {
        params.append('verdict', debouncedVerdictSearch)
      }

      const response = await fetch(`/api/students/export?${params}`)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the blob from response
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `students-export-${date}.xlsx`
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    fetchStudents(1, pagination.limit)
  }, [debouncedNameUidSearch, debouncedCollegeSearch, debouncedEvaluationSearch, debouncedInterviewSearch, debouncedVerdictSearch, pagination.limit])

  const handlePageChange = (newPage: number) => {
    fetchStudents(newPage, pagination.limit)
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }))
    fetchStudents(1, newLimit)
  }

  const handleRowClick = (studentUid: string) => {
    router.push(`/students/${studentUid}`)
  }

  const shortenUrl = (url: string, studentName?: string) => {
    // Use student name if available, otherwise use a short identifier
    if (studentName) {
      // Use first name or first 2 words
      const nameParts = studentName.trim().split(/\s+/)
      if (nameParts.length > 0) {
        return nameParts[0].substring(0, 15) // First name, max 15 chars
      }
    }
    // Fallback: extract UID and show first 8 chars
    try {
      const match = url.match(/students\/([^\/]+)/)
      if (match) {
        return match[1].substring(0, 8) + '...'
      }
    } catch {
      // Ignore
    }
    return 'Link'
  }

  const getEvaluationScore = (student: Student) => {
    if (!evaluationSearch || !student.evaluation_scores) return null
    const score = student.evaluation_scores[evaluationSearch.toLowerCase() as keyof typeof student.evaluation_scores]
    return score !== null && score !== undefined ? String(score) : null
  }

  const getInterviewScore = (student: Student) => {
    if (!interviewSearch) return null
    if (interviewSearch === 'tr1') return student.tr1_score ? String(student.tr1_score) : null
    if (interviewSearch === 'tr2') return student.tr2_score ? String(student.tr2_score) : null
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Student Portfolio
              </h1>
              <p className="text-gray-600">
                Discover and evaluate talented candidates
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gray-50 rounded-lg px-6 py-3 border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
              </div>
              <button
                onClick={handleExportToExcel}
                disabled={exporting || loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title={nameUidSearch || collegeSearch || evaluationSearch || interviewSearch || verdictSearch ? "Export filtered students" : "Export all students"}
              >
                {exporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export to Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Name/UID Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={nameUidSearch}
                onChange={(e) => setNameUidSearch(e.target.value)}
                placeholder="Search by Name or UID..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* College Search with Dropdown */}
            <div className="relative">
              <select
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none"
              >
                <option value="">All Colleges</option>
                {colleges.map((college) => (
                  <option key={college} value={college}>
                    {college}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Overall Evaluation Search with Dropdown */}
            <div className="relative">
              <select
                value={evaluationSearch}
                onChange={(e) => setEvaluationSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none"
              >
                <option value="">All Evaluations</option>
                <option value="coding">Coding</option>
                <option value="dsa">DSA</option>
                <option value="cs fundamentals">CS Fundamentals</option>
                <option value="quantitative">Quantitative</option>
                <option value="logical">Logical</option>
                <option value="verbal">Verbal</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* TR1/TR2 Search with Dropdown */}
            <div className="relative">
              <select
                value={interviewSearch}
                onChange={(e) => setInterviewSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none"
              >
                <option value="">All Interviews</option>
                {availableInterviews.map((interviewType) => (
                  <option key={interviewType} value={interviewType}>
                    {interviewType.toUpperCase()}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Final Verdict Search with Dropdown */}
            <div className="relative">
              <select
                value={verdictSearch}
                onChange={(e) => setVerdictSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none"
              >
                <option value="">All Verdicts</option>
                {availableVerdicts.map((verdict) => (
                  <option key={verdict} value={verdict}>
                    {verdict}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(nameUidSearch || collegeSearch || evaluationSearch || interviewSearch || verdictSearch) && (
            <div className="mb-4">
              <button
                onClick={() => {
                  setNameUidSearch('')
                  setCollegeSearch('')
                  setEvaluationSearch('')
                  setInterviewSearch('')
                  setVerdictSearch('')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Table */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-6 text-gray-600">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-600">No students found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    {!evaluationSearch && !interviewSearch && !verdictSearch && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          College Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Report Link
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assessment
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          TR1
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          TR2
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Final Verdict
                        </th>
                      </>
                    )}
                    {evaluationSearch && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {evaluationSearch.charAt(0).toUpperCase() + evaluationSearch.slice(1)} Score
                      </th>
                    )}
                    {interviewSearch && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {interviewSearch.toUpperCase()} Score
                      </th>
                    )}
                    {verdictSearch && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Final Verdict
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => {
                    const profileUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}/students/${student.student_uid}`
                      : `https://academy-edge-dashboard.vercel.app/students/${student.student_uid}`

                    const evaluationScore = getEvaluationScore(student)
                    const interviewScore = getInterviewScore(student)

                    return (
                      <tr
                        key={student.student_uid}
                        onClick={() => handleRowClick(student.student_uid)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-900">
                            {student.student_uid}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {student.basic_info?.name || 'N/A'}
                          </span>
                        </td>
                        {!evaluationSearch && !interviewSearch && !verdictSearch && (
                          <>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-600">
                                {student.basic_info?.university || student.basic_info?.college_name || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <a
                                href={profileUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                title={profileUrl}
                              >
                                {shortenUrl(profileUrl, student.basic_info?.name)}
                              </a>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {student.assessment_score !== null && student.assessment_score !== undefined
                                  ? String(student.assessment_score)
                                  : 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {student.tr1_score !== null && student.tr1_score !== undefined
                                  ? String(student.tr1_score)
                                  : 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {student.tr2_score !== null && student.tr2_score !== undefined
                                  ? String(student.tr2_score)
                                  : 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${student.final_verdict === 'Strong Hire' ? 'text-green-600' :
                                student.final_verdict === 'Hire' ? 'text-blue-600' :
                                  student.final_verdict === 'Weak Hire' ? 'text-yellow-600' :
                                    'text-gray-500'
                                }`}>
                                {student.final_verdict || 'N/A'}
                              </span>
                            </td>
                          </>
                        )}
                        {evaluationSearch && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {evaluationScore || 'N/A'}
                            </span>
                          </td>
                        )}
                        {interviewSearch && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {interviewScore || 'N/A'}
                            </span>
                          </td>
                        )}
                        {verdictSearch && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${student.final_verdict === 'Strong Hire' ? 'text-green-600' :
                                student.final_verdict === 'Hire' ? 'text-blue-600' :
                                  student.final_verdict === 'Weak Hire' ? 'text-yellow-600' :
                                    'text-gray-500'
                              }`}>
                              {student.final_verdict || 'N/A'}
                            </span>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-6 py-4 shadow-sm mt-6">
                <div className="flex items-center gap-4">
                  <div className="text-gray-600 text-sm">
                    Showing <span className="font-semibold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-semibold text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>{' '}
                    of <span className="font-semibold text-gray-900">{pagination.total}</span> students
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">Per page:</span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(Number(e.target.value))}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={75}>75</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700 font-medium text-sm flex items-center">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
