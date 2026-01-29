const { MongoClient } = require('mongodb');

async function migrate() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('student_dashboard');

        console.log("Starting migration...");

        const totalStudentsCount = await db.collection('students').countDocuments({});
        console.log(`Total population: ${totalStudentsCount}`);

        const verdicts = await db.collection('final_verdicts').find({}).toArray();
        console.log(`Found ${verdicts.length} verdicts to potentially update.`);

        const studentsAssessment = await db.collection('students').find({}, { projection: { student_uid: 1, 'assessment.scores.student_assessment_score': 1 } }).toArray();
        const studentsTr1 = await db.collection('students-tr1').find({}, { projection: { student_uid: 1, 'tr1.total_score': 1 } }).toArray();
        const studentsTr2 = await db.collection('students-tr2').find({}, { projection: { student_uid: 1, 'tr2.overall_score': 1 } }).toArray();

        const tr1Map = new Map(studentsTr1.map(s => [s.student_uid, parseFloat(s.tr1?.total_score || 0)]));
        const tr2Map = new Map(studentsTr2.map(s => [s.student_uid, parseFloat(s.tr2?.overall_score || 0)]));
        const assessmentMap = new Map(studentsAssessment.map(s => [s.student_uid, parseFloat(s.assessment?.scores?.student_assessment_score || 0)]));

        const assessmentScoresList = studentsAssessment
            .map(s => parseFloat(s.assessment?.scores?.student_assessment_score || 0))
            .sort((a, b) => b - a);

        let updatedCount = 0;

        for (const verdict of verdicts) {
            const uid = verdict.student_uid;
            const assessmentScore = assessmentMap.get(uid) || 0;
            const tr1Score = tr1Map.get(uid) || 0;
            const tr2Score = tr2Map.get(uid) || 0;

            const totalScore = assessmentScore + tr1Score + tr2Score;

            // Calculate rank against assessment baseline
            let higherCount = 0;
            // Binary search for speed
            let low = 0, high = assessmentScoresList.length;
            while (low < high) {
                let mid = (low + high) >>> 1;
                if (assessmentScoresList[mid] > totalScore) low = mid + 1;
                else high = mid;
            }
            higherCount = low;

            const topRank = higherCount + 1;
            const topPercentage = (totalStudentsCount > 0) ? (topRank / totalStudentsCount) * 100 : 0;

            await db.collection('final_verdicts').updateOne(
                { _id: verdict._id },
                {
                    $set: {
                        total_cumulative_score: totalScore,
                        top_percentage: topPercentage <= 0.5 ? topPercentage : null,
                        percentile_rank: topPercentage,
                        updated_at: new Date()
                    }
                }
            );
            updatedCount++;
        }

        console.log(`Successfully migrated ${updatedCount} verdicts.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

migrate();
