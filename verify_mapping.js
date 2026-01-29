const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function verify() {
    await client.connect();
    const db = client.db('student_dashboard');

    const verdicts = await db.collection('final_verdicts').find({ top_percentage: { $ne: null } }).sort({ top_percentage: 1 }).toArray();

    console.log(`Total mapped verdicts: ${verdicts.length}`);
    if (verdicts.length > 0) {
        console.log(`Min Percentile (Highest Score): ${verdicts[0].top_percentage}%`);
        console.log(`Max Percentile (Lowest Score): ${verdicts[verdicts.length - 1].top_percentage}%`);

        console.log('\nSample mapping:');
        verdicts.slice(0, 5).forEach((v, i) => {
            console.log(`${i + 1}. Score: ${v.total_cumulative_score}, %: ${v.top_percentage.toFixed(4)}%`);
        });
        console.log('...');
        verdicts.slice(-5).forEach((v, i) => {
            console.log(`${verdicts.length - 4 + i}. Score: ${v.total_cumulative_score}, %: ${v.top_percentage.toFixed(4)}%`);
        });

        const uniquePercentages = new Set(verdicts.map(v => v.top_percentage));
        console.log(`\nUnique Percentiles: ${uniquePercentages.size} / ${verdicts.length}`);
    }

    await client.close();
}

verify();
