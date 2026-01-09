const { MongoClient } = require('mongodb');
const fs = require('fs');

async function run() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('student_dashboard');
        console.log("Connected to DB: student_dashboard");

        const pipeline = [];

        // 1. Lookups
        pipeline.push(
            {
                $lookup: {
                    from: 'students',
                    localField: 'student_uid',
                    foreignField: 'student_uid',
                    as: 'assessment_data'
                }
            }
        );

        // 2. No Filter, Just Limit
        pipeline.push({ $limit: 5 });

        console.log("Running pipeline on 'students-tr2' (no filter, limit 5)...");
        const results = await db.collection('students-tr2').aggregate(pipeline).toArray();

        let output = '';
        output += "Results count: " + results.length + "\n";
        if (results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                output += `--- Doc ${i} ---\n`;
                output += "UID: " + results[i].student_uid + "\n";
                output += "assessment_data length: " + (results[i].assessment_data ? results[i].assessment_data.length : 'N/A') + "\n";
                if (results[i].assessment_data && results[i].assessment_data.length > 0) {
                    const doc = results[i].assessment_data[0];
                    if (doc.assessment && doc.assessment.scores) {
                        output += "dsa_student_score: " + doc.assessment.scores.dsa_student_score + "\n";
                    } else {
                        output += "No assessment.scores found\n";
                    }
                } else {
                    output += "assessment_data is empty\n";
                }
            }
        }

        fs.writeFileSync('debug_pipeline_out.txt', output);
        console.log("Written to debug_pipeline_out.txt");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
