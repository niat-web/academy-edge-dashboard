const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
    await client.connect();
    const db = client.db('student_dashboard');
    const colls = await db.listCollections().toArray();
    for (let c of colls) {
        const sample = await db.collection(c.name).findOne({});
        const count = await db.collection(c.name).countDocuments({});
        console.log(`Collection: ${c.name} (Count: ${count})`);
        console.log(JSON.stringify(sample, null, 2).substring(0, 500));
        console.log('---');
    }
    await client.close();
}

run();
