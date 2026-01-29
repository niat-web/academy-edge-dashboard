const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://psm_db_user:PSMTeam-2024@academy-dashboard-clust.tpk215n.mongodb.net/academy-edge-dashboard?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function migrate() {
    try {
        await client.connect();
        const db = client.db('student_dashboard');

        console.log('Fetching student cohort data...');
        const allStudents = await db.collection('students').find({}).toArray();

        const sections = [
            { key: 'coding', student: 'coding_student_score', max: 'coding_section_score' },
            { key: 'dsa_mcq', student: 'dsa_student_score', max: 'dsa_section_score' },
            { key: 'cs_fundamentals', student: 'cs_fundamentals_student_score', max: 'cs_fundamentals_section_score' },
            { key: 'quantitative', student: 'quantitative_student_score', max: 'quantitative_section_score' },
            { key: 'logical', student: 'logical_student_score', max: 'logical_section_score' },
            { key: 'verbal', student: 'verbal_student_score', max: 'verbal_section_score' }
        ];

        // 1. Calculate min/max for each section across the cohort
        const sectionStats = {};
        sections.forEach(s => {
            const scores = allStudents.map(student => parseFloat(String(student.assessment?.scores?.[s.student] || 0)));
            sectionStats[s.key] = {
                min: Math.min(...scores),
                max: Math.max(...scores)
            };
            console.log(`Section ${s.key} range: ${sectionStats[s.key].min} to ${sectionStats[s.key].max}`);
        });

        // 2. Map scores for each student
        const updates = allStudents.map(student => {
            const sectionPercentiles = {};
            const assessmentScores = student.assessment?.scores || {};

            sections.forEach(s => {
                const score = parseFloat(String(assessmentScores[s.student] || 0));
                const stats = sectionStats[s.key];

                if (score > 0) {
                    let p = 0.5;
                    if (stats.max > stats.min) {
                        p = 0.5 - ((score - stats.min) / (stats.max - stats.min)) * (0.5 - 0.1);
                    } else {
                        p = 0.1;
                    }
                    p = Math.max(0.1, Math.min(0.5, p));

                    // Determine if performance is "good" to show the badge
                    // Using a threshold of top 30% of their own section max score or top 0.35 in mapping
                    const sectionMax = parseFloat(String(assessmentScores[s.max] || 100));
                    if (score >= sectionMax * 0.7) {
                        sectionPercentiles[s.key] = p;
                    }
                }
            });

            return {
                updateOne: {
                    filter: { student_uid: student.student_uid },
                    update: {
                        $set: {
                            section_percentiles: Object.keys(sectionPercentiles).length > 0 ? sectionPercentiles : null,
                            updated_at: new Date()
                        }
                    }
                }
            };
        });

        console.log(`Updating ${updates.length} verdicts with section percentiles...`);

        if (updates.length > 0) {
            const result = await db.collection('final_verdicts').bulkWrite(updates);
            console.log(`Successfully updated ${result.modifiedCount} verdicts.`);
        }

        console.log('Migration complete!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.close();
    }
}

migrate();
