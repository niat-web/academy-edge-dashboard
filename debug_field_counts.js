const { MongoClient } = require('mongodb');

async function run() {
    // Connection URL
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        // Use the correct database name identified earlier
        const db = client.db('student_dashboard');
        console.log("Connected to DB: student_dashboard");

        // Check DSA
        const dsaStudent = await db.collection('students').countDocuments({
            "assessment.scores.dsa_student_score": { $exists: true }
        });
        const dsaSection = await db.collection('students').countDocuments({
            "assessment.scores.dsa_section_score": { $exists: true }
        });

        console.log(`DSA - student_score: ${dsaStudent}`);
        console.log(`DSA - section_score: ${dsaSection}`);

        // Check Coding
        const codingStudent = await db.collection('students').countDocuments({
            "assessment.scores.coding_student_score": { $exists: true }
        });
        const codingSection = await db.collection('students').countDocuments({
            "assessment.scores.coding_section_score": { $exists: true }
        });

        console.log(`Coding - student_score: ${codingStudent}`);
        console.log(`Coding - section_score: ${codingSection}`);

        // Check Logical
        const logicalStudent = await db.collection('students').countDocuments({
            "assessment.scores.logical_student_score": { $exists: true }
        });
        const logicalSection = await db.collection('students').countDocuments({
            "assessment.scores.logical_section_score": { $exists: true }
        });

        console.log(`Logical - student_score: ${logicalStudent}`);
        console.log(`Logical - section_score: ${logicalSection}`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
