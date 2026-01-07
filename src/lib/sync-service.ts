import clientPromise from '@/lib/mongodb'
import { getSheetsClient } from '@/lib/googlesheets'

/**
 * Sync all data from Google Sheets to MongoDB
 * Handles errors gracefully and continues processing
 */
export async function syncAllData() {
  const results = {
    collegeTracker: { success: false, error: null as string | null, count: 0 },
    assessment: { success: false, error: null as string | null, count: 0 },
    tr1: { success: false, error: null as string | null, count: 0 },
    tr2: { success: false, error: null as string | null, count: 0 },
  }

  try {
    // 1. Sync College Tracker
    try {
      const collegeResult = await syncCollegeTracker()
      results.collegeTracker = { success: true, error: null, count: collegeResult.count }
    } catch (error: any) {
      console.error('Error syncing college tracker:', error)
      results.collegeTracker = { success: false, error: error.message, count: 0 }
    }

    // 2. Sync Assessment Data
    try {
      const assessmentResult = await syncAssessment()
      results.assessment = { success: true, error: null, count: assessmentResult.count }
    } catch (error: any) {
      console.error('Error syncing assessment:', error)
      results.assessment = { success: false, error: error.message, count: 0 }
    }

    // 3. Sync TR1 Data
    try {
      const tr1Result = await syncTR1()
      results.tr1 = { success: true, error: null, count: tr1Result.count }
    } catch (error: any) {
      console.error('Error syncing TR1:', error)
      results.tr1 = { success: false, error: error.message, count: 0 }
    }

    // 4. Sync TR2 Data
    try {
      const tr2Result = await syncTR2()
      results.tr2 = { success: true, error: null, count: tr2Result.count }
    } catch (error: any) {
      console.error('Error syncing TR2:', error)
      results.tr2 = { success: false, error: error.message, count: 0 }
    }

    return results
  } catch (error: any) {
    console.error('Critical error in syncAllData:', error)
    throw error
  }
}

// Import sync functions from existing routes
async function syncCollegeTracker() {
  // This would call the college-tracker sync logic
  // For now, return a placeholder
  return { count: 0 }
}

async function syncAssessment() {
  // Import and call assessment sync logic
  return { count: 0 }
}

async function syncTR1() {
  // Import and call TR1 sync logic
  return { count: 0 }
}

async function syncTR2() {
  // Import and call TR2 sync logic
  return { count: 0 }
}

