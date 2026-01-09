const { MongoClient } = require('mongodb');

async function run() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('student_dashboard');
        const oneStudent = await db.collection('students').findOne({ "assessment.scores": { $exists: true } });

        if (oneStudent && oneStudent.assessment && oneStudent.assessment.scores) {
            const keys = Object.keys(oneStudent.assessment.scores);
            for (const k of keys) console.log("KEY: " + k);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
