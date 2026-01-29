const { MongoClient } = require('mongodb');

async function analyze() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    console.log("Using URI:", uri.replace(/:([^@]+)@/, ":****@"));
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('student_dashboard');
        console.log("Using DB:", db.databaseName);
        console.log("UNIQUE_TAG_ANTIGRAVITY_12345");

        console.log("Analyzing all students...");

        // Get all students assessment scores
        const allStudents = await db.collection('students').find({}, { projection: { student_uid: 1, 'assessment.scores.student_assessment_score': 1 } }).toArray();
        console.log(`Total students: ${allStudents.length}`);

        // Get TR1 and TR2 scores
        const studentsTr1 = await db.collection('students-tr1').find({}, { projection: { student_uid: 1, 'tr1.total_score': 1 } }).toArray();
        const studentsTr2 = await db.collection('students-tr2').find({}, { projection: { student_uid: 1, 'tr2.overall_score': 1 } }).toArray();

        const tr1Map = new Map(studentsTr1.map(s => [s.student_uid, parseFloat(s.tr1?.total_score || 0)]));
        const tr2Map = new Map(studentsTr2.map(s => [s.student_uid, parseFloat(s.tr2?.overall_score || 0)]));

        const allTotalScores = allStudents.map(s => {
            const assessmentScore = parseFloat(s.assessment?.scores?.student_assessment_score || 0);
            const tr1Score = tr1Map.get(s.student_uid) || 0;
            const tr2Score = tr2Map.get(s.student_uid) || 0;
            return assessmentScore + tr1Score + tr2Score;
        });

        allTotalScores.sort((a, b) => b - a);

        const populationSize = allTotalScores.length;
        const slices = [0.001, 0.002, 0.003, 0.004, 0.005, 0.01];

        console.log(`Total Population: ${populationSize}`);
        slices.forEach(p => {
            const count = Math.ceil(p * populationSize);
            const threshold = allTotalScores[count - 1] || 'N/A';
            console.log(`Top ${p * 100}% (${count} students) threshold: ${threshold}`);
        });

        // Check TR2 finalists specifically
        const tr2Finalists = studentsTr2.filter(s => s.student_uid).map(s => {
            const uid = s.student_uid;
            const assessmentScore = parseFloat(allStudents.find(as => as.student_uid === uid)?.assessment?.scores?.student_assessment_score || 0);
            const tr1Score = tr1Map.get(uid) || 0;
            const tr2Score = tr2Map.get(uid) || 0;
            return assessmentScore + tr1Score + tr2Score;
        });

        tr2Finalists.sort((a, b) => b - a);
        console.log(`TR2 finalists count: ${tr2Finalists.length}`);
        console.log(`TR2 highest score: ${tr2Finalists[0]}`);
        console.log(`TR2 lowest score: ${tr2Finalists[tr2Finalists.length - 1]}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

analyze();
