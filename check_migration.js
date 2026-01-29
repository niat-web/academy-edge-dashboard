const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function check() {
    await client.connect();
    const db = client.db('student_dashboard');
    const count = await db.collection('final_verdicts').countDocuments({ top_percentage: { $ne: null } });
    console.log(`Verdicts with Top Percentage: ${count}`);

    const samples = await db.collection('final_verdicts').find({ top_percentage: { $ne: null } }).limit(3).toArray();
    samples.forEach(v => {
        console.log(`UID: ${v.student_uid}, Top %: ${v.top_percentage}`);
    });

    await client.close();
}

check();
