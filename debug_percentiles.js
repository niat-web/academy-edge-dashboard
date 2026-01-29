const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function debug() {
    await client.connect();
    const db = client.db('student_dashboard');

    const verdicts = await db.collection('final_verdicts').find({ top_percentage: { $ne: null } }).limit(10).toArray();

    console.log('Sample Percentiles:');
    verdicts.forEach(v => {
        console.log(`UID: ${v.student_uid}, Score: ${v.total_cumulative_score}, %: ${v.top_percentage}, Raw Rank: ${v.percentile_rank}`);
    });

    const totalStudents = await db.collection('students').countDocuments({});
    console.log(`Actual Total Students in DB: ${totalStudents}`);

    await client.close();
}

debug();
