import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from multiple possible paths
function loadEnv() {
    const searchPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '..', '.env'),
        path.resolve('C:\\Users\\Hauna\\Downloads\\project-bolt-sb1-gqfzf2es (6)\\project\\.env')
    ];
    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            console.log('Loading env from:', p);
            dotenv.config({ path: p });
            if (process.env.MONGODB_URI) return true;
        }
    }
    return false;
}
loadEnv();

const uri = process.env.MONGODB_URI;

async function check() {
    if (!uri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(process.env.MONGODB_DB_NAME || 'test');

        // 1. List all training programs
        console.log('=== ALL TRAINING PROGRAMS ===');
        const programs = await db.collection('training_programs').find({}).toArray();
        programs.forEach(p => {
            console.log(`- Title: "${p.title}" | ID: ${p.id} | Status: ${p.status}`);
        });

        // 2. Look for B4 program specifically
        console.log('\n=== SEARCHING FOR B4 PROGRAM ===');
        const b4Programs = programs.filter(p =>
            p.title?.toLowerCase().includes('b4') ||
            p.title?.toLowerCase().includes('mentor')
        );

        if (b4Programs.length > 0) {
            console.log('Found matching programs:');
            b4Programs.forEach(p => console.log(`- "${p.title}" | ID: ${p.id}`));
        } else {
            console.log('No B4 or Mentor programs found!');
        }

        // 3. Check mentor assignments for phone 9916777753
        console.log('\n=== MENTOR ASSIGNMENTS FOR 9916777753 ===');
        const mentor = await db.collection('mentors').findOne({ phone: '9916777753' });
        if (mentor) {
            console.log('Mentor found:', mentor.first_name, mentor.last_name, '| ID:', mentor.id || mentor._id);

            const mentorId = mentor.id || mentor._id.toString();
            const assignments = await db.collection('mentor_training_assignments').find({
                mentor_id: mentorId
            }).toArray();

            if (assignments.length > 0) {
                console.log('Assignments:');
                assignments.forEach(a => console.log(`- Program ID: ${a.training_program_id} | Status: ${a.status}`));
            } else {
                console.log('No assignments found for this mentor!');
            }
        } else {
            console.log('Mentor with phone 9916777753 NOT FOUND in mentors collection!');
        }

        // 4. Also check teacher collection
        console.log('\n=== TEACHER WITH PHONE 9916777753 ===');
        const teacher = await db.collection('teachers').findOne({ phone: '9916777753' });
        if (teacher) {
            console.log('Teacher found:', teacher.first_name, teacher.last_name, '| ID:', teacher.id);

            // Check training assignments for this teacher
            const teacherAssignments = await db.collection('training_assignments').find({
                teacher_id: teacher.id
            }).toArray();

            if (teacherAssignments.length > 0) {
                console.log('Teacher Assignments:');
                teacherAssignments.forEach(a => console.log(`- Program ID: ${a.training_program_id} | Status: ${a.status}`));
            } else {
                console.log('No training assignments for this teacher.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

check();
