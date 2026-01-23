/**
 * Script to generate verdicts for all students who don't have one
 * 
 * Usage:
 *   npx tsx scripts/generate-verdicts.ts [maxToProcess]
 *   or
 *   npm run generate-verdicts [maxToProcess]
 * 
 * Examples:
 *   npm run generate-verdicts          # Process up to 1000 students (default)
 *   npm run generate-verdicts 50        # Process up to 50 students
 *   npm run generate-verdicts 100       # Process up to 100 students
 */

// Load environment variables FIRST before any other imports
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local (Next.js default) or .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function main() {
  // Check for required environment variables
  if (!process.env.MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is not set!')
    console.error('\nPlease ensure you have a .env.local or .env file with MONGODB_URI set.')
    console.error('Example: MONGODB_URI=mongodb://localhost:27017/your-database')
    process.exit(1)
  }

  // Dynamically import modules that depend on environment variables
  const { generateVerdictsForAllStudents } = await import('../src/lib/verdict-service')

  console.log('🚀 Starting verdict generation for students without verdicts...\n')

  try {
    // You can specify maxToProcess to limit how many to process (default is 50)
    // For local runs, you might want to process all, so set a high number
    const maxToProcess = process.argv[2] ? parseInt(process.argv[2], 10) : 1000

    console.log(`📊 Processing up to ${maxToProcess} students...\n`)

    const result = await generateVerdictsForAllStudents(maxToProcess)

    console.log('\n' + '='.repeat(60))
    console.log('📈 VERDICT GENERATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total students needing verdicts: ${result.total}`)
    console.log(`Processed: ${result.processed}`)
    console.log(`✅ Succeeded: ${result.succeeded}`)
    console.log(`❌ Failed: ${result.failed}`)
    console.log('='.repeat(60))

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach((error, idx) => {
        console.log(`  ${idx + 1}. ${error.student_uid}: ${error.error}`)
      })
    }

    if (result.processed < result.total) {
      console.log(`\n⚠️  Note: ${result.total - result.processed} students still need verdicts.`)
      console.log('   Run this script again to process more students.')
    } else {
      console.log('\n✅ All students have been processed!')
    }

    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()

