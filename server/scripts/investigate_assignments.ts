
import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb'; // Adjust path if needed
import { ObjectId } from 'mongodb';

async function investigate() {
    try {
        await mongodb.connect();
        const db = mongodb.getDb();
        console.log('Connected to DB');

        // 1. Find Users (Mentors)
        console.log('\n--- Searching for Mentors ---');
        const searchNames = ['rahila', 'safa'];
        const mentorIds: Record<string, string> = {};

        for (const name of searchNames) {
            const regex = new RegExp(name, 'i');
            // Search in MENTORS collection
            const mentors = await db.collection('mentors').find({
                $or: [
                    { first_name: regex },
                    { last_name: regex },
                    { email: regex }
                ]
            }).toArray();

            console.log(`Found ${mentors.length} matches for "${name}" in 'mentors' collection:`);
            mentors.forEach(m => {
                const id = m.id || m._id.toString();
                console.log(` - ID: ${id}, Name: ${m.first_name} ${m.last_name}, Email: ${m.email}, Status: ${m.status}`);
                // Store first match or precise match logic if needed
                // For now just store the first ID found for queries
                if (!mentorIds[name]) mentorIds[name] = id;
            });

            // Also check USERS just in case
            const users = await db.collection('users').find({
                $or: [
                    { full_name: regex },
                    { username: regex }
                ]
            }).toArray();
            if (users.length > 0) {
                console.log(`Found ${users.length} matches for "${name}" in 'users' collection (info only):`);
                users.forEach(u => console.log(` - ID: ${u.id || u._id}, Name: ${u.full_name}, Role: ${u.role}`));
            }
        }

        // 2. Find Training Program
        console.log('\n--- Searching for Training Program ---');
        const programTitle = "Online Mentors' Training-B4";
        const program = await db.collection(Collections.TRAINING_PROGRAMS).findOne({
            title: new RegExp("Online Mentors' Training-B4", 'i') // Case insensitive just in case
        });

        if (program) {
            const pId = program.id || program._id.toString();
            console.log(`Found Program: "${program.title}"`);
            console.log(` - ID: ${pId}`);
            console.log(` - Target Audience: ${program.target_audience}`);

            // 3. Find Assignments
            console.log('\n--- Searching for Assignments ---');

            // Check 'training_assignments'
            console.log(`Checking 'training_assignments' collection...`);
            const assignments = await db.collection(Collections.TRAINING_ASSIGNMENTS).find({
                training_program_id: pId
            }).toArray();

            console.log(`Total assignments found for this program: ${assignments.length}`);

            for (const name of searchNames) {
                const mId = mentorIds[name];
                if (mId) {
                    const userAssignments = assignments.filter((a: any) =>
                        a.mentor_id === mId || a.teacher_id === mId || a.user_id === mId
                    );

                    if (userAssignments.length > 0) {
                        console.log(`FAIL: Found ${userAssignments.length} assignments for ${name} (${mId}) in training_assignments.`);
                        userAssignments.forEach(a => console.log(JSON.stringify(a, null, 2)));
                    } else {
                        console.log(`WARN: No assignments found for ${name} (${mId}) in training_assignments.`);
                    }
                } else {
                    console.log(`SKIP: No Mentor ID found for ${name}, cannot check assignments.`);
                }
            }

            // Check if there is a separate 'mentor_training_assignments' collection
            console.log(`\nChecking 'mentor_training_assignments' collection (if exists)...`);
            try {
                const mentorAssignments = await db.collection('mentor_training_assignments').find({
                    training_program_id: pId
                }).toArray();
                console.log(`Total assignments found in 'mentor_training_assignments': ${mentorAssignments.length}`);

                for (const name of searchNames) {
                    const mId = mentorIds[name];
                    if (mId) {
                        const userAssignments = mentorAssignments.filter((a: any) => a.mentor_id === mId);
                        if (userAssignments.length > 0) {
                            console.log(`INFO: Found ${userAssignments.length} assignments for ${name} (${mId}) in mentor_training_assignments.`);
                            userAssignments.forEach(a => console.log(JSON.stringify(a, null, 2)));
                        }
                    }
                }

            } catch (e) {
                console.log("Collection 'mentor_training_assignments' likely does not exist or error accessing it.");
            }

        } else {
            console.log(`ERROR: Program "${programTitle}" not found.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

investigate();
