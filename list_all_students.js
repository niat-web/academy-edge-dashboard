const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
    await client.connect();
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    console.log('Available Databases:');
    for (let dbInfo of dbs.databases) {
        const db = client.db(dbInfo.name);
        try {
            const count = await db.collection('students').countDocuments({});
            if (count > 0) {
                console.log(`- ${dbInfo.name}: ${count} students`);
            }
        } catch (e) { }
    }
    await client.close();
}

run();
