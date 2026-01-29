const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function migrate() {
    try {
        await client.connect();
        const db = client.db('student_dashboard');

        console.log('Fetching student data...');
        const allStudents = await db.collection('students').find({}).toArray();
        const studentsTr1 = await db.collection('students-tr1').find({}).toArray();
        const studentsTr2 = await db.collection('students-tr2').find({}).toArray();

        const tr1Map = new Map(studentsTr1.map(s => [s.student_uid, parseFloat(s.tr1?.total_score || 0)]));
        const tr2Map = new Map(studentsTr2.map(s => [s.student_uid, parseFloat(s.tr2?.overall_score || 0)]));

        // 1. Calculate cumulative scores for all students
        const studentScores = allStudents.map(s => {
            const assessmentScore = parseFloat(s.assessment?.scores?.student_assessment_score || 0);
            const tr1Score = tr1Map.get(s.student_uid) || 0;
            const tr2Score = tr2Map.get(s.student_uid) || 0;
            return {
                uid: s.student_uid,
                total: assessmentScore + tr1Score + tr2Score
            };
        });

        // 2. Find min and max scores in the cohort
        const totalScores = studentScores.map(s => s.total);
        const globalMin = Math.min(...totalScores);
        const globalMax = Math.max(...totalScores);

        console.log(`Cohort Score Range: ${globalMin} to ${globalMax}`);

        // 3. Perform Linear Mapping (0.1% to 0.5%)
        // Formula: 0.5 - ((score - min) / (max - min)) * (0.5 - 0.1)
        const updates = studentScores.map(s => {
            let topPercentage = 0.5;
            if (globalMax > globalMin) {
                topPercentage = 0.5 - ((s.total - globalMin) / (globalMax - globalMin)) * (0.5 - 0.1);
            } else {
                topPercentage = 0.1; // Fallback if all scores are same
            }

            // Safety clamp
            topPercentage = Math.max(0.1, Math.min(0.5, topPercentage));

            return {
                updateOne: {
                    filter: { student_uid: s.uid },
                    update: {
                        $set: {
                            total_cumulative_score: s.total,
                            top_percentage: topPercentage,
                            percentile_rank: topPercentage,
                            updated_at: new Date()
                        }
                    }
                }
            };
        });

        console.log(`Updating ${updates.length} verdicts in final_verdicts...`);

        if (updates.length > 0) {
            const result = await db.collection('final_verdicts').bulkWrite(updates);
            console.log(`Successfully updated ${result.modifiedCount} verdicts.`);
        }

        console.log('Migration complete!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.close();
    }
}

migrate();
