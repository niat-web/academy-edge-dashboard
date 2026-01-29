const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function check() {
    await client.connect();
    const db = client.db('student_dashboard');
    console.log("Using DB:", db.databaseName);
    const count = await db.collection('students').countDocuments({});
    console.log(`countDocuments: ${count}`);

    const all = await db.collection('students').find({}, { projection: { _id: 1 } }).toArray();
    console.log(`toArray.length: ${all.length}`);

    await client.close();
}

check();
