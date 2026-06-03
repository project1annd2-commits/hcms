import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function createAssignmentsWithTeacherMapping() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Clear existing training assignments
        await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).deleteMany({});
        console.log('Cleared existing training assignments');

        // Read the backup file to get attendance data and old teacher data
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        
        console.log(`Total attendance records in backup: ${backupData.data.training_attendance.length}`);
        
        // Get unique assignment data from attendance records
        const assignmentMap = new Map();
        
        backupData.data.training_attendance.forEach((record: any) => {
            if (record.assignment_id && record.teacher_id) {
                assignmentMap.set(record.assignment_id, {
                    id: record.assignment_id,
                    teacher_id: record.teacher_id, // Old teacher ID
                    training_program_id: record.training_program_id,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    teacher: record.teacher // Teacher data from attendance
                });
            }
        });
        
        const uniqueAssignments = Array.from(assignmentMap.values());
        console.log(`Unique assignments from attendance: ${uniqueAssignments.length}`);
        
        // Get current teachers from database
        const currentTeachers = await db.find(Collections.TEACHERS, { status: 'active' });
        console.log(`Current teachers in database: ${currentTeachers.length}`);
        
        // Get the active training program
        const programs = await db.find(Collections.TRAINING_PROGRAMS, { status: 'active' });
        if (programs.length === 0) {
            console.log('No active training programs found');
            return;
        }
        
        const activeProgram = programs[0];
        console.log(`Active program: ${activeProgram.title} (${activeProgram.id})`);
        
        // Create a mapping function to match old teachers to new teachers
        function findMatchingTeacher(oldTeacher: any, currentTeachers: any[]) {
            // Check if oldTeacher exists
            if (!oldTeacher) {
                return null;
            }
            
            // Try to match by phone number first (most reliable)
            if (oldTeacher.phone) {
                const phoneMatch = currentTeachers.find((teacher: any) => teacher.phone === oldTeacher.phone);
                if (phoneMatch) return phoneMatch;
            }
            
            // Try to match by name and school
            const nameSchoolMatch = currentTeachers.find((teacher: any) => 
                teacher.first_name === oldTeacher.first_name &&
                teacher.last_name === oldTeacher.last_name &&
                teacher.school_id === oldTeacher.school_id
            );
            
            return nameSchoolMatch || null;
        }
        
        // Create assignments with mapped teacher IDs
        const assignmentsToCreate = [];
        let successfullyMapped = 0;
        let failedToMap = 0;
        
        for (const attendanceAssignment of uniqueAssignments) {
            const matchingTeacher = findMatchingTeacher(attendanceAssignment.teacher, currentTeachers);
            
            if (matchingTeacher) {
                const newAssignment = {
                    id: attendanceAssignment.id,
                    training_program_id: activeProgram.id,
                    teacher_id: matchingTeacher.id, // Use current teacher ID
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
                successfullyMapped++;
            } else {
                // Log more detailed information about the failed mapping
                const teacherInfo = attendanceAssignment.teacher ? 
                    `${attendanceAssignment.teacher.first_name || ''} ${attendanceAssignment.teacher.last_name || ''} (${attendanceAssignment.teacher.phone || 'no phone'})` : 
                    'Unknown teacher';
                console.log(`Failed to map teacher: ${teacherInfo}`);
                failedToMap++;
            }
        }
        
        console.log(`Successfully mapped: ${successfullyMapped} assignments`);
        console.log(`Failed to map: ${failedToMap} assignments`);
        
        if (assignmentsToCreate.length === 0) {
            console.log('No assignments to create');
            return;
        }
        
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
        console.error('Error creating assignments with teacher mapping:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createAssignmentsWithTeacherMapping();