import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function createFinalAssignments() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Clear existing training assignments
        await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).deleteMany({});
        console.log('Cleared existing training assignments');

        // Read the backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        
        console.log(`Total attendance records in backup: ${backupData.data.training_attendance.length}`);
        console.log(`Total teachers in backup: ${backupData.data.teachers.length}`);
        
        // Create a map of old teacher IDs to teacher data
        const oldTeacherMap = new Map();
        backupData.data.teachers.forEach((teacher: any) => {
            oldTeacherMap.set(teacher.id, teacher);
        });
        
        console.log(`Mapped ${oldTeacherMap.size} teachers from backup`);
        
        // Get unique assignment data from attendance records
        const assignmentMap = new Map();
        
        backupData.data.training_attendance.forEach((record: any) => {
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
        
        // Get current teachers from database
        const currentTeachers = await db.find(Collections.TEACHERS, { status: 'active' });
        console.log(`Current teachers in database: ${currentTeachers.length}`);
        
        // Create a map of current teachers by phone for fast lookup
        const currentTeacherByPhone = new Map();
        currentTeachers.forEach((teacher: any) => {
            if (teacher.phone) {
                currentTeacherByPhone.set(teacher.phone, teacher);
            }
        });
        
        console.log(`Mapped ${currentTeacherByPhone.size} current teachers by phone`);
        
        // Get the active training program
        const programs = await db.find(Collections.TRAINING_PROGRAMS, { status: 'active' });
        if (programs.length === 0) {
            console.log('No active training programs found');
            return;
        }
        
        const activeProgram = programs[0];
        console.log(`Active program: ${activeProgram.title} (${activeProgram.id})`);
        
        // Create assignments with current teacher IDs
        const assignmentsToCreate = [];
        let matchedByPhone = 0;
        let unmatched = 0;
        
        for (const attendanceAssignment of uniqueAssignments) {
            // Get the old teacher data
            const oldTeacher = oldTeacherMap.get(attendanceAssignment.teacher_id);
            if (!oldTeacher) {
                console.log(`Warning: Could not find old teacher with ID ${attendanceAssignment.teacher_id}`);
                unmatched++;
                continue;
            }
            
            // Try to match by phone first
            let matchingTeacher = null;
            if (oldTeacher.phone && currentTeacherByPhone.has(oldTeacher.phone)) {
                matchingTeacher = currentTeacherByPhone.get(oldTeacher.phone);
                matchedByPhone++;
            }
            
            if (matchingTeacher) {
                const newAssignment = {
                    id: attendanceAssignment.id,
                    training_program_id: activeProgram.id,
                    teacher_id: matchingTeacher.id,
                    assigned_date: attendanceAssignment.created_at ? new Date(attendanceAssignment.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    due_date: null,
                    completion_date: null,
                    status: 'assigned',
                    progress_percentage: 0,
                    score: null,
                    assigned_by: null,
                    created_at: attendanceAssignment.created_at ? new Date(attendanceAssignment.created_at).toISOString() : new Date().toISOString(),
                    updated_at: attendanceAssignment.updated_at ? new Date(attendanceAssignment.updated_at).toISOString() : new Date().toISOString()
                };
                
                assignmentsToCreate.push(newAssignment);
            } else {
                console.log(`Warning: Could not find matching teacher for ${oldTeacher.first_name} ${oldTeacher.last_name} (Phone: ${oldTeacher.phone})`);
                unmatched++;
            }
        }
        
        console.log(`Matched by phone: ${matchedByPhone}`);
        console.log(`Unmatched: ${unmatched}`);
        console.log(`Creating ${assignmentsToCreate.length} training assignments...`);
        
        if (assignmentsToCreate.length === 0) {
            console.log('No assignments to create');
            return;
        }
        
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
        console.log('\n=== Sample Assignments with Teacher Verification ===');
        
        for (const assignment of sampleAssignments) {
            const teacher = await db.findById(Collections.TEACHERS, assignment.teacher_id);
            console.log(`Assignment ID: ${assignment.id}`);
            console.log(`  Teacher: ${teacher?.first_name} ${teacher?.last_name} (${assignment.teacher_id})`);
            console.log(`  Program: ${activeProgram.title} (${assignment.training_program_id})`);
            console.log(`  Status: ${assignment.status}`);
            console.log('---');
        }

    } catch (error) {
        console.error('Error creating final assignments:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createFinalAssignments();