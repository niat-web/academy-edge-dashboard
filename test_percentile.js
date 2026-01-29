const clientPromise = require('./src/lib/mongodb').default;
const { generateVerdictForStudent } = require('./src/lib/verdict-service');

async function test() {
    const client = await clientPromise;
    const db = client.db('student_dashboard');

    // Find a student with a high score
    const student = await db.collection('students')
        .find({ 'assessment.scores.student_assessment_score': { $exists: true } })
        .sort({ 'assessment.scores.student_assessment_score': -1 })
        .limit(1)
        .toArray();

    if (student.length === 0) {
        console.log('No students found');
        return;
    }

    const uid = student[0].student_uid;
    console.log(`Testing with student UID: ${uid}`);

    // Force delete existing verdict to re-generate
    await db.collection('final_verdicts').deleteOne({ student_uid: uid });

    const result = await generateVerdictForStudent(uid);
    console.log('Result:', JSON.stringify(result, null, 2));

    process.exit(0);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
