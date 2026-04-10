import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function loadEnv() {
    const searchPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '..', '.env'),
        path.resolve('C:\\Users\\Hauna\\Downloads\\project-bolt-sb1-gqfzf2es (6)\\project\\.env')
    ];
    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            dotenv.config({ path: p });
            if (process.env.MONGODB_URI) return true;
        }
    }
    return false;
}
loadEnv();

const uri = process.env.MONGODB_URI;

async function createB4Program() {
    if (!uri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(process.env.MONGODB_DB_NAME || 'test');

        // Check if B4 program already exists
        const existingProgram = await db.collection('training_programs').findOne({
            title: { $regex: /B4|Mentor.*Training/i }
        });

        if (existingProgram) {
            console.log('B4 Program already exists:', existingProgram.title);
            console.log('ID:', existingProgram.id);
            return;
        }

        // Create the B4 Mentors Training Program
        const programId = uuidv4();
        const now = new Date().toISOString();

        const b4Program = {
            id: programId,
            title: "Online Mentors' Training-B4",
            description: "Online training program for mentors - Batch 4",
            start_date: "2025-12-09",
            end_date: "2025-12-12",
            status: "active",
            category: "mentor_training",
            duration_hours: 3,
            max_participants: 50,
            is_mandatory: true,
            created_at: now,
            updated_at: now,
            enable_marks_card: true,
            assessment_components: [
                { name: "Attendance", max_marks: 20, weightage: 20 },
                { name: "Participation", max_marks: 30, weightage: 30 },
                { name: "Assessment", max_marks: 50, weightage: 50 }
            ]
        };

        await db.collection('training_programs').insertOne(b4Program);
        console.log('✓ Created B4 Mentors Training Program');
        console.log('  Title:', b4Program.title);
        console.log('  ID:', programId);

        // Now find and assign Maaz l to this program
        const mentor = await db.collection('mentors').findOne({ phone: '9916777753' });

        if (mentor) {
            const mentorId = mentor.id || mentor._id.toString();

            // Check if assignment already exists
            const existingAssignment = await db.collection('mentor_training_assignments').findOne({
                mentor_id: mentorId,
                training_program_id: programId
            });

            if (!existingAssignment) {
                const assignmentId = uuidv4();
                await db.collection('mentor_training_assignments').insertOne({
                    id: assignmentId,
                    mentor_id: mentorId,
                    training_program_id: programId,
                    assigned_date: now.split('T')[0],
                    status: 'assigned',
                    progress_percentage: 0,
                    score: null,
                    assigned_by: 'system',
                    created_at: now,
                    updated_at: now
                });
                console.log('✓ Assigned Maaz l to B4 program');
            } else {
                console.log('Assignment already exists for Maaz l');
            }
        }

        // Also check if there's a teacher record and create assignment
        const teacher = await db.collection('teachers').findOne({ phone: '9916777753' });
        if (teacher) {
            const teacherId = teacher.id || teacher._id.toString();

            const existingTeacherAssignment = await db.collection('mentor_training_assignments').findOne({
                mentor_id: teacherId,
                training_program_id: programId
            });

            if (!existingTeacherAssignment) {
                const assignmentId = uuidv4();
                await db.collection('mentor_training_assignments').insertOne({
                    id: assignmentId,
                    mentor_id: teacherId,
                    training_program_id: programId,
                    assigned_date: now.split('T')[0],
                    status: 'assigned',
                    progress_percentage: 0,
                    score: null,
                    assigned_by: 'system',
                    created_at: now,
                    updated_at: now
                });
                console.log('✓ Assigned teacher Maaz l to B4 program (using teacher ID)');
            }
        }

        // Verify
        console.log('\n=== VERIFICATION ===');
        const programs = await db.collection('training_programs').find({}).toArray();
        console.log(`Total Training Programs: ${programs.length}`);
        programs.forEach(p => console.log(`- ${p.title} (${p.status})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

createB4Program();
