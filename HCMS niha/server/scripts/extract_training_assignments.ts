import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function extractTrainingAssignments() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Read the backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        
        console.log('Backup file loaded successfully');
        console.log('Total training attendance records:', backupData.data.training_attendance.length);
        
        // Extract unique training assignments from attendance records
        const assignmentsMap = new Map();
        
        backupData.data.training_attendance.forEach((attendance: any) => {
            if (attendance.assignment_id && attendance.teacher_id && attendance.training_program_id) {
                // Create assignment object from attendance data
                const assignment = {
                    id: attendance.assignment_id,
                    training_program_id: attendance.training_program_id,
                    teacher_id: attendance.teacher_id,
                    assigned_date: attendance.created_at ? new Date(attendance.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    due_date: null,
                    completion_date: null,
                    status: attendance.assignment?.status || 'assigned',
                    progress_percentage: attendance.assignment?.progress_percentage || 0,
                    score: attendance.assignment?.score || null,
                    assigned_by: null,
                    created_at: attendance.created_at ? new Date(attendance.created_at).toISOString() : new Date().toISOString(),
                    updated_at: attendance.updated_at ? new Date(attendance.updated_at).toISOString() : new Date().toISOString()
                };
                
                // Only store unique assignments
                if (!assignmentsMap.has(assignment.id)) {
                    assignmentsMap.set(assignment.id, assignment);
                }
            }
        });
        
        const assignments = Array.from(assignmentsMap.values());
        console.log('Extracted unique training assignments:', assignments.length);
        
        // Insert assignments into database
        console.log('Inserting training assignments...');
        let assignmentsInserted = 0;
        const batchSize = 50;
        
        for (let i = 0; i < assignments.length; i += batchSize) {
            const batch = assignments.slice(i, i + batchSize);
            
            try {
                await db.insertMany(Collections.TRAINING_ASSIGNMENTS, batch);
                assignmentsInserted += batch.length;
                console.log(`Inserted assignment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(assignments.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting assignment batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        
        console.log(`Successfully inserted ${assignmentsInserted} training assignments`);
        
        // Verify the insertion
        const count = await db.count(Collections.TRAINING_ASSIGNMENTS, {});
        console.log(`Total training assignments in database: ${count}`);
        
    } catch (error) {
        console.error('Error extracting training assignments:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

extractTrainingAssignments();