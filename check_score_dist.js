const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
    await client.connect();
    const db = client.db('student_dashboard');

    const allStudents = await db.collection('students').find({}).toArray();
    const studentsTr1 = await db.collection('students-tr1').find({}).toArray();
    const studentsTr2 = await db.collection('students-tr2').find({}).toArray();

    const tr1Map = new Map(studentsTr1.map(s => [s.student_uid, parseFloat(s.tr1?.total_score || 0)]));
    const tr2Map = new Map(studentsTr2.map(s => [s.student_uid, parseFloat(s.tr2?.overall_score || 0)]));

    const scores = allStudents.map(s => {
        const assessmentScore = parseFloat(s.assessment?.scores?.student_assessment_score || 0);
        const tr1Score = tr1Map.get(s.student_uid) || 0;
        const tr2Score = tr2Map.get(s.student_uid) || 0;
        return {
            uid: s.student_uid,
            assessment: assessmentScore,
            tr1: tr1Score,
            tr2: tr2Score,
            total: assessmentScore + tr1Score + tr2Score
        };
    });

    scores.sort((a, b) => b.total - a.total);

    console.log('Top 20 Scores:');
    scores.slice(0, 20).forEach((s, i) => {
        console.log(`${i + 1}. UID: ${s.uid}, Total: ${s.total} (A: ${s.assessment}, TR1: ${s.tr1}, TR2: ${s.tr2})`);
    });

    const uniqueScores = new Set(scores.map(s => s.total));
    console.log(`\nUnique Total Scores: ${uniqueScores.size} / ${scores.length}`);

    await client.close();
}

run();
