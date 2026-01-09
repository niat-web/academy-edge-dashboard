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

        // 2. Unwind
        pipeline.push({
            $unwind: {
                path: '$assessment_data',
                preserveNullAndEmptyArrays: true
            }
        });

        // 3. Filter (DSA)
        const fieldPath = 'assessment.scores.dsa_student_score';
        const matchStage = {
            $match: {
                [`assessment_data.${fieldPath}`]: { $exists: true, $nin: [null, ''] }
            }
        };
        pipeline.push(matchStage);

        // 4. Project
        pipeline.push({
            $project: {
                student_uid: 1,
                assessment_data: 1
            }
        });

        const results = await db.collection('students-tr2').aggregate(pipeline).toArray();

        let output = '';
        output += "Results count: " + results.length + "\n";

        // Simulate Mapping
        const enriched = results.map(student => {
            const assessment = student.assessment_data; // unwound
            return {
                uid: student.student_uid,
                dsa_score: assessment?.assessment?.scores?.dsa_student_score || 'N/A_MAP',
                // full_scores: assessment?.assessment?.scores
            }
        });

        if (enriched.length > 0) {
            output += "First Enriched: " + JSON.stringify(enriched[0], null, 2) + "\n";
        } else {
            output += "Enriched array empty\n";
        }

        fs.writeFileSync('debug_pipeline_unwind.txt', output);
        console.log("Written to debug_pipeline_unwind.txt");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
