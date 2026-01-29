const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017"; // Assuming local or env-based connection

async function analyze() {
    const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
    try {
        await client.connect();
        const db = client.db('student_dashboard');

        console.log("Analyzing students...");

        // Get all student UIDs from students-tr2 (the primary collection for students who finished the process)
        const studentsTr2 = await db.collection('students-tr2').find({}, { projection: { student_uid: 1, 'tr2.overall_score': 1 } }).toArray();
        console.log(`Total students in students-tr2: ${studentsTr2.length}`);

        const studentsTr1 = await db.collection('students-tr1').find({}, { projection: { student_uid: 1, 'tr1.total_score': 1 } }).toArray();
        console.log(`Total students in students-tr1: ${studentsTr1.length}`);

        const studentsAssessment = await db.collection('students').find({}, { projection: { student_uid: 1, 'assessment.scores.student_assessment_score': 1 } }).toArray();
        console.log(`Total students in students (assessment): ${studentsAssessment.length}`);

        // Create maps for quick lookup
        const tr1Map = new Map(studentsTr1.map(s => [s.student_uid, s.tr1?.total_score]));
        const assessmentMap = new Map(studentsAssessment.map(s => [s.student_uid, s.assessment?.scores?.student_assessment_score]));

        const allScores = [];

        for (const student of studentsTr2) {
            const uid = student.student_uid;
            const tr2Score = parseFloat(student.tr2?.overall_score || 0);
            const tr1Score = parseFloat(tr1Map.get(uid) || 0);
            const assessmentScore = parseFloat(assessmentMap.get(uid) || 0);

            const totalScore = tr2Score + tr1Score + assessmentScore;
            if (!isNaN(totalScore)) {
                allScores.push(totalScore);
            }
        }

        allScores.sort((a, b) => b - a);

        console.log(`Valid combined scores: ${allScores.length}`);

        const percentiles = [0.001, 0.002, 0.003, 0.004, 0.005];
        percentiles.forEach(p => {
            const index = Math.floor(p * allScores.length);
            console.log(`Top ${p * 100}% index: ${index}, Score threshold: ${allScores[index] || 'N/A'}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

analyze();
