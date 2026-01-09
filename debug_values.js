const { MongoClient } = require('mongodb');
const fs = require('fs');

async function run() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('student_dashboard');

        // Find a doc that has both if possible
        const doc = await db.collection('students').findOne({
            "assessment.scores.dsa_student_score": { $exists: true }
        });

        let output = '';
        if (doc && doc.assessment && doc.assessment.scores) {
            output += `UID: ${doc.student_uid}\n`;
            output += `DSA Student: ${doc.assessment.scores.dsa_student_score} (Type: ${typeof doc.assessment.scores.dsa_student_score})\n`;
            output += `DSA Section: ${doc.assessment.scores.dsa_section_score} (Type: ${typeof doc.assessment.scores.dsa_section_score})\n`;
        } else {
            output += "No doc found.\n";
        }

        fs.writeFileSync('debug_values.txt', output);
        console.log("Done");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
