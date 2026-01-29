const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
    await client.connect();
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    console.log('Searching for 32k collection...');
    for (let dbInfo of dbs.databases) {
        const db = client.db(dbInfo.name);
        const colls = await db.listCollections().toArray();
        for (let c of colls) {
            const count = await db.collection(c.name).countDocuments({});
            if (count > 5000) {
                console.log(`FOUND!! DB: ${dbInfo.name}, Collection: ${c.name}, Count: ${count}`);
            }
        }
    }
    await client.close();
}

run();
