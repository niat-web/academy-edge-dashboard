const { MongoClient } = require('mongodb');

async function analyze() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('student_dashboard');

        console.log("Analyzing students...");

        const studentsTr2 = await db.collection('students-tr2').find({}, { projection: { student_uid: 1, 'tr2.overall_score': 1 } }).toArray();
        const studentsTr1 = await db.collection('students-tr1').find({}, { projection: { student_uid: 1, 'tr1.total_score': 1 } }).toArray();
        const studentsAssessment = await db.collection('students').find({}, { projection: { student_uid: 1, 'assessment.scores.student_assessment_score': 1 } }).toArray();

        const tr1Map = new Map(studentsTr1.map(s => [s.student_uid, s.tr1?.total_score]));
        const assessmentMap = new Map(studentsAssessment.map(s => [s.student_uid, s.assessment?.scores?.student_assessment_score]));

        const allScores = [];
        let countAllThree = 0;

        for (const student of studentsTr2) {
            const uid = student.student_uid;
            const tr2Score = parseFloat(student.tr2?.overall_score || 0);
            const tr1Score = parseFloat(tr1Map.get(uid) || 0);
            const assessmentScore = parseFloat(assessmentMap.get(uid) || 0);

            const totalScore = tr2Score + tr1Score + assessmentScore;
            if (!isNaN(totalScore)) {
                allScores.push(totalScore);
                if (tr2Score > 0 && tr1Score > 0 && assessmentScore > 0) {
                    countAllThree++;
                }
            }
        }

        allScores.sort((a, b) => b - a);

        console.log(`Total students in students-tr2: ${studentsTr2.length}`);
        console.log(`Students with all 3 scores > 0: ${countAllThree}`);
        console.log(`Sample top scores: ${allScores.slice(0, 10).join(', ')}`);
        console.log(`Median score: ${allScores[Math.floor(allScores.length / 2)]}`);

        const populationSize = allScores.length;
        const slices = [0.001, 0.002, 0.003, 0.004, 0.005];
        slices.forEach(p => {
            const count = Math.ceil(p * populationSize);
            const threshold = allScores[count - 1] || 'N/A';
            console.log(`Top ${p * 100}% (${count} students) threshold: ${threshold}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

analyze();
