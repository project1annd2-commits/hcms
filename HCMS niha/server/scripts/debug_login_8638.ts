
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    // Fallback: try different paths or check if .env is in parent
    const altEnvPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(altEnvPath)) {
        dotenv.config({ path: altEnvPath });
    }
}

const MONGODB_URI = process.env.VITE_MONGODB_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI environment variable');
    process.exit(1);
}

const PHONE = '8638759556';

async function checkTeacherAssignment() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✓ Connected to MongoDB');
        const db = client.db('test'); // Adjust DB name if needed

        console.log(`\n=== CHECKING PHONE: ${PHONE} ===`);

        // 1. Check Teacher
        const teachers = await db.collection('teachers').find({}).toArray();
        const teacher = teachers.find(t => (t.phone || '').replace(/\s+/g, '') === PHONE);

        if (teacher) {
            console.log('✓ Found TEACHER record:');
            console.log(`  ID: ${teacher.id || teacher._id}`);
            console.log(`  Name: ${teacher.first_name} ${teacher.last_name}`);
            console.log(`  School ID: ${teacher.school_id}`);

            // 2. Check Mentor Training Assignments for this Teacher ID
            // NOTE: The login logic checks 'mentor_training_assignments' where mentor_id matches teacher_id
            const assignments = await db.collection('mentor_training_assignments').find({
                mentor_id: teacher.id || teacher._id.toString()
            }).toArray();

            console.log(`\nFound ${assignments.length} Mentor Training Assignments for this teacher:`);
            if (assignments.length > 0) {
                for (const assignment of assignments) {
                    // Get program details
                    const program = await db.collection('training_programs').findOne({ id: assignment.training_program_id });
                    console.log(`  - Program: ${program ? program.title : assignment.training_program_id}`);
                    console.log(`    Status: ${assignment.status}`);
                    console.log(`    Date: ${assignment.assigned_date}`);
                }
            } else {
                console.log('  ❌ NO Mentor Assignments found for this teacher ID.');
                console.log('  This explains the login failure. The teacher needs a record in "mentor_training_assignments" with mentor_id = teacher.id');
            }

        } else {
            console.log('❌ Teacher NOT FOUND with this phone number.');
        }

        // 3. Check Mentor Collection (just in case)
        const mentors = await db.collection('mentors').find({}).toArray();
        const mentor = mentors.find(m => (m.phone || '').replace(/\s+/g, '') === PHONE);

        if (mentor) {
            console.log('\n✓ Found MENTOR record:');
            console.log(`  ID: ${mentor.id || mentor._id}`);
            console.log(`  Name: ${mentor.first_name} ${mentor.last_name}`);
            console.log(`  Status: ${mentor.status}`);
        } else {
            console.log('\nℹ️ No MENTOR record found (expected for a teacher).');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkTeacherAssignment();
