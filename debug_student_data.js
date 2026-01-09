const { MongoClient } = require('mongodb');
const fs = require('fs');

async function run() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('student_dashboard');
        console.log("Connected to DB: student_dashboard");

        const uid = "abaa6722-a4ac-4475-9299-a107f457c4fc";

        // Check 'students' collection (Assessment Data)
        const studentDoc = await db.collection('students').findOne({ student_uid: uid });

        let output = '';
        output += "Student Doc (students): " + (studentDoc ? "Found" : "Not Found") + "\n";
        if (studentDoc) {
            output += "Full Doc Keys: " + JSON.stringify(Object.keys(studentDoc)) + "\n";
            output += "Assessment: " + JSON.stringify(studentDoc.assessment, null, 2) + "\n";
        }

        // Check 'students-tr2' collection
        const tr2Doc = await db.collection('students-tr2').findOne({ student_uid: uid });
        output += "TR2 Doc: " + (tr2Doc ? "Found" : "Not Found") + "\n";

        fs.writeFileSync('debug_student_data.txt', output);
        console.log("Written to debug_student_data.txt");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
