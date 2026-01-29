const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
    await client.connect();
    const db = client.db('student_dashboard');
    const students = await db.collection('students')
        .find({ 'assessment.scores.student_assessment_score': { $exists: true } })
        .sort({ 'assessment.scores.student_assessment_score': -1 })
        .limit(10)
        .toArray();

    students.forEach(s => {
        console.log(`UID: ${s.student_uid}, Score: ${s.assessment.scores.student_assessment_score}`);
    });

    await client.close();
}

run();
