const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam%402024@academy-dashboard-clust.tpk215n.mongodb.net/?appName=academy-dashboard-cluster';
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        console.log('Databases on alternative URI:');
        for (let dbInfo of dbs.databases) {
            const db = client.db(dbInfo.name);
            try {
                const count = await db.collection('students').countDocuments({});
                console.log(`- ${dbInfo.name}: ${count} students`);
            } catch (e) { }
        }
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await client.close();
    }
}

run();
