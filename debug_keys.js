const { MongoClient } = require('mongodb');

async function run() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('student_dashboard');
        const oneStudent = await db.collection('students').findOne({ "assessment.scores": { $exists: true } });

        if (oneStudent && oneStudent.assessment && oneStudent.assessment.scores) {
            console.log("KEYS_BEGIN");
            console.log(JSON.stringify(Object.keys(oneStudent.assessment.scores)));
            console.log("KEYS_END");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
