const { MongoClient } = require('mongodb');

async function run() {
    const uri = "mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();

        // Switch to correct DB
        const db = client.db('student_dashboard');
        console.log("Connected to DB: student_dashboard");

        // List collections
        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));

        // Get number of docs in students-tr2
        const countTr2 = await db.collection('students-tr2').countDocuments();
        console.log(`students-tr2 count: ${countTr2}`);

        // Get number of docs in students
        const countStudents = await db.collection('students').countDocuments();
        console.log(`students count: ${countStudents}`);

        // Get any one doc from students collection that has assessment
        // Using simple find first
        const oneStudent = await db.collection('students').findOne({ "assessment.scores": { $exists: true } });

        if (oneStudent) {
            console.log("Sample Student Doc ID:", oneStudent._id);
            console.log("Student UID:", oneStudent.student_uid);

            if (oneStudent.assessment && oneStudent.assessment.scores) {
                console.log("Available score keys:", Object.keys(oneStudent.assessment.scores));
                // Print one value
                const keys = Object.keys(oneStudent.assessment.scores);
                if (keys.length > 0) {
                    const key = keys[0];
                    const val = oneStudent.assessment.scores[key];
                    console.log(`Sample Key: ${key}, Value: ${val}, Type: ${typeof val}`);
                }
            }
        } else {
            console.log("No documents found in 'students' collection (with assessment.scores)");
            const any = await db.collection('students').findOne({});
            if (any) console.log("Any doc keys:", Object.keys(any));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

run();
