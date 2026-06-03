
var { mongodb, Collections } = require('./src/config/mongodb');
var { db } = require('./src/services/db');

async function checkData() {
    await mongodb.connect();

    console.log('--- ALL MENTORS ---');
    const mentors = await db.find(Collections.MENTORS, {});
    console.log(`Found ${mentors.length} mentors`);
    mentors.forEach(m => {
        console.log(`Mentor: ${m.full_name} (${m.id}), School: ${m.school_id || 'NONE'}, Status: ${m.status}`);
    });

    console.log('\n--- MENTOR assignments ---');
    const assignments = await db.find(Collections.MENTOR_TRAINING_ASSIGNMENTS, {});
    console.log(`Found ${assignments.length} assignments`);

    assignments.forEach(a => {
        const mentor = mentors.find(m => m.id === a.mentor_id);
        const mentorName = mentor ? mentor.full_name : 'UNKNOWN';
        console.log(`Assignment for: ${mentorName} (${a.mentor_id}), Program: ${a.training_program_id}`);
    });

    await mongodb.disconnect();
}

checkData();
