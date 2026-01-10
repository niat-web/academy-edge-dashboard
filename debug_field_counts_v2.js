const { MongoClient } = require('mongodb');
const fs = require('fs');

async function run() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);
    

    try {
        await client.connect();
        const db = client.db('student_dashboard');
        console.log("Connected to DB: student_dashboard");

        // Check DSA
        const dsaStudent = await db.collection('students').countDocuments({
            "assessment.scores.dsa_student_score": { $exists: true }
        });
        const dsaSection = await db.collection('students').countDocuments({
            "assessment.scores.dsa_section_score": { $exists: true }
        });

        // Check Coding
        const codingStudent = await db.collection('students').countDocuments({
            "assessment.scores.coding_student_score": { $exists: true }
        });
        const codingSection = await db.collection('students').countDocuments({
            "assessment.scores.coding_section_score": { $exists: true }
        });

        // Check Logical
        const logicalStudent = await db.collection('students').countDocuments({
            "assessment.scores.logical_student_score": { $exists: true }
        });
        const logicalSection = await db.collection('students').countDocuments({
            "assessment.scores.logical_section_score": { $exists: true }
        });

        let output = '';
        output += `DSA - student_score: ${dsaStudent}\n`;
        output += `DSA - section_score: ${dsaSection}\n`;
        output += `Coding - student_score: ${codingStudent}\n`;
        output += `Coding - section_score: ${codingSection}\n`;
        output += `Logical - student_score: ${logicalStudent}\n`;
        output += `Logical - section_score: ${logicalSection}\n`;

        fs.writeFileSync('debug_counts.txt', output);
        console.log("Written to debug_counts.txt");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
