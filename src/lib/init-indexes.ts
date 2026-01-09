/**
 * Database Index Initialization Script
 * 
 * This script creates indexes on MongoDB collections to optimize query performance.
 * Run this once to set up indexes for better read performance.
 * 
 * Usage: npx tsx src/lib/init-indexes.ts
 */

import clientPromise from './mongodb'

async function initializeIndexes() {
  console.log('🔧 Initializing database indexes...')
  
  try {
    const client = await clientPromise
    const db = client.db('student_dashboard')
    
    // Students-TR2 Collection (main student list)
    console.log('📊 Creating indexes on students-tr2 collection...')
    const studentsTr2 = db.collection('students-tr2')
    
    await studentsTr2.createIndex({ student_uid: 1 }, { unique: true, name: 'idx_student_uid' })
    console.log('  ✓ Created index: student_uid')
    
    await studentsTr2.createIndex({ 'basic_info.name': 1 }, { name: 'idx_basic_info_name' })
    console.log('  ✓ Created index: basic_info.name')
    
    await studentsTr2.createIndex({ 'basic_info.university': 1 }, { name: 'idx_basic_info_university' })
    console.log('  ✓ Created index: basic_info.university')
    
    await studentsTr2.createIndex({ 'basic_info.college_name': 1 }, { name: 'idx_basic_info_college_name' })
    console.log('  ✓ Created index: basic_info.college_name')
    
    await studentsTr2.createIndex({ 'timestamps.updated_at': -1 }, { name: 'idx_timestamps_updated_at' })
    console.log('  ✓ Created index: timestamps.updated_at')
    
    // Compound index for common search pattern
    await studentsTr2.createIndex(
      { 'basic_info.name': 'text', student_uid: 'text' },
      { name: 'idx_text_search' }
    )
    console.log('  ✓ Created text index: name and uid search')
    
    // Students Collection (assessment data)
    console.log('📊 Creating indexes on students collection...')
    const students = db.collection('students')
    
    await students.createIndex({ student_uid: 1 }, { name: 'idx_student_uid' })
    console.log('  ✓ Created index: student_uid')
    
    await students.createIndex({ 'assessment.scores.coding_student_score': 1 }, { sparse: true, name: 'idx_coding_score' })
    console.log('  ✓ Created index: coding_student_score')
    
    await students.createIndex({ 'assessment.scores.dsa_student_score': 1 }, { sparse: true, name: 'idx_dsa_score' })
    console.log('  ✓ Created index: dsa_student_score')
    
    await students.createIndex({ 'assessment.scores.cs_fundamentals_student_score': 1 }, { sparse: true, name: 'idx_cs_fundamentals_score' })
    console.log('  ✓ Created index: cs_fundamentals_student_score')
    
    // Students-TR1 Collection
    console.log('📊 Creating indexes on students-tr1 collection...')
    const studentsTr1 = db.collection('students-tr1')
    
    await studentsTr1.createIndex({ student_uid: 1 }, { name: 'idx_student_uid' })
    console.log('  ✓ Created index: student_uid')
    
    // Final Verdicts Collection
    console.log('📊 Creating indexes on final_verdicts collection...')
    const finalVerdicts = db.collection('final_verdicts')
    
    await finalVerdicts.createIndex({ student_uid: 1 }, { name: 'idx_student_uid' })
    console.log('  ✓ Created index: student_uid')
    
    console.log('✅ All indexes created successfully!')
    console.log('\n📈 Performance tips:')
    console.log('  - Indexes improve read performance but use additional storage')
    console.log('  - Monitor index usage with db.collection.stats()')
    console.log('  - Consider adding more indexes based on query patterns')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    process.exit(1)
  }
}

// Run the initialization
initializeIndexes()
