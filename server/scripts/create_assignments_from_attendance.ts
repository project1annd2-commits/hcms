import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function createAssignmentsFromAttendance() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Clear existing training assignments
        await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).deleteMany({});
        console.log('Cleared existing training assignments');

        // Get all training attendance records
        const attendanceRecords = await db.find(Collections.TRAINING_ATTENDANCE, {});
        console.log(`Total attendance records: ${attendanceRecords.length}`);
        
        // Get unique assignment data from attendance records
        const assignmentMap = new Map();
        
        attendanceRecords.forEach((record: any) => {
            if (record.assignment_id && record.teacher_id) {
                assignmentMap.set(record.assignment_id, {
                    id: record.assignment_id,
                    teacher_id: record.teacher_id,
                    training_program_id: record.training_program_id,
                    created_at: record.created_at,
                    updated_at: record.updated_at
                });
            }
        });
        
        const uniqueAssignments = Array.from(assignmentMap.values());
        console.log(`Unique assignments from attendance: ${uniqueAssignments.length}`);
        
        // Get the active training program
        const programs = await db.find(Collections.TRAINING_PROGRAMS, { status: 'active' });
        if (programs.length === 0) {
            console.log('No active training programs found');
            return;
        }
        
        const activeProgram = programs[0];
        console.log(`Active program: ${activeProgram.title} (${activeProgram.id})`);
        
        // Create assignments with correct IDs and link to current program
        const assignmentsToCreate = uniqueAssignments.map((attendanceAssignment: any) => {
            return {
                id: attendanceAssignment.id,
                training_program_id: activeProgram.id, // Use current program ID
                teacher_id: attendanceAssignment.teacher_id,
                assigned_date: attendanceAssignment.created_at ? new Date(attendanceAssignment.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                due_date: null,
                completion_date: null,
                status: 'assigned',
                progress_percentage: 0,
                score: null,
                assigned_by: null,
                created_at: attendanceAssignment.created_at || new Date().toISOString(),
                updated_at: attendanceAssignment.updated_at || new Date().toISOString()
            };
        });
        
        console.log(`Creating ${assignmentsToCreate.length} training assignments...`);
        
        // Insert assignments in batches
        const batchSize = 50;
        let assignmentsInserted = 0;
        
        for (let i = 0; i < assignmentsToCreate.length; i += batchSize) {
            const batch = assignmentsToCreate.slice(i, i + batchSize);
            try {
                await db.insertMany(Collections.TRAINING_ASSIGNMENTS, batch);
                assignmentsInserted += batch.length;
                console.log(`Inserted assignment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(assignmentsToCreate.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting assignment batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        
        console.log(`Successfully created ${assignmentsInserted} training assignments`);
        
        // Verify the insertion
        const count = await db.count(Collections.TRAINING_ASSIGNMENTS, {});
        console.log(`Total training assignments in database: ${count}`);
        
        // Check a sample to verify the relationships
        const sampleAssignments = await db.find(Collections.TRAINING_ASSIGNMENTS, {}, { limit: 3 });
        console.log('\n=== Sample Assignments ===');
        
        for (const assignment of sampleAssignments) {
            console.log(`Assignment ID: ${assignment.id}`);
            console.log(`  Teacher ID: ${assignment.teacher_id}`);
            console.log(`  Program ID: ${assignment.training_program_id}`);
            console.log(`  Assigned date: ${assignment.assigned_date}`);
            console.log(`  Status: ${assignment.status}`);
            console.log('---');
        }

    } catch (error) {
        console.error('Error creating assignments from attendance:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createAssignmentsFromAttendance();