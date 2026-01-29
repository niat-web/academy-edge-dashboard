const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function verify() {
    await client.connect();
    const db = client.db('student_dashboard');

    console.log("Starting verification...");

    // 1. Get total students count
    const totalStudentsCount = await db.collection('students').countDocuments({});
    console.log(`Total population: ${totalStudentsCount}`);

    // 2. Pick a high-scoring student (simulated)
    // Let's assume a total score of 300
    const testScore = 300;

    const higherScoringCount = await db.collection('students').countDocuments({
        'assessment.scores.student_assessment_score': { $gt: testScore.toString() }
    });

    const topRank = higherScoringCount + 1;
    const topPercentage = (topRank / totalStudentsCount) * 100;

    console.log(`For a total score of ${testScore}:`);
    console.log(`- Students scoring higher: ${higherScoringCount}`);
    console.log(`- Rank: ${topRank}`);
    console.log(`- Percentage: ${topPercentage.toFixed(4)}%`);

    if (topPercentage <= 0.5) {
        console.log("Result: Qualifies for Top Percentage badge!");
    } else {
        console.log("Result: Does not qualify.");
    }

    // 3. Test with a real student
    const topStudent = await db.collection('students')
        .find({ 'assessment.scores.student_assessment_score': { $exists: true } })
        .sort({ 'assessment.scores.student_assessment_score': -1 })
        .limit(1)
        .toArray();

    if (topStudent.length > 0) {
        const s = topStudent[0];
        const score = parseFloat(s.assessment.scores.student_assessment_score);
        const higherCount = await db.collection('students').countDocuments({
            'assessment.scores.student_assessment_score': { $gt: score.toString() }
        });
        const rank = higherCount + 1;
        const perc = (rank / totalStudentsCount) * 100;
        console.log(`Real Top Student (${s.student_uid}):`);
        console.log(`- Score: ${score}`);
        console.log(`- Rank: ${rank}`);
        console.log(`- Percentage: ${perc.toFixed(4)}%`);
    }

    await client.close();
}

verify();
