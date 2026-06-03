import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function fixAssignmentRelationships() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        // Read the backup file to get correct relationships
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));

        console.log('=== FIXING TRAINING ASSIGNMENT RELATIONSHIPS ===\n');

        // Get assignments from backup reports
        const backupAssignments = backupData.reports.active_assignments;
        console.log(`Found ${backupAssignments.length} assignments in backup\n`);

        // Get current assignments
        const currentAssignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .find({})
            .toArray();

        console.log(`Current assignments in MongoDB: ${currentAssignments.length}\n`);

        let updated = 0;
        let errors = 0;

        console.log('Updating assignments with correct teacher and program IDs...\n');

        for (const assignment of currentAssignments) {
            // Find matching assignment in backup
            const backupMatch = backupAssignments.find((a: any) => a.id === assignment.id);

            if (backupMatch) {
                const updates: any = {};

                // Fix teacher_id
                if (backupMatch.teacher_id && backupMatch.teacher_id !== assignment.teacher_id) {
                    updates.teacher_id = backupMatch.teacher_id;
                }

                // Fix training_program_id
                if (backupMatch.training_program_id && backupMatch.training_program_id !== assignment.training_program_id) {
                    updates.training_program_id = backupMatch.training_program_id;
                }

                // Update if there are changes
                if (Object.keys(updates).length > 0) {
                    try {
                        await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).updateOne(
                            { id: assignment.id },
                            { $set: updates }
                        );
                        updated++;
                        if (updated <= 5) {
                            console.log(`  ✓ Updated assignment ${assignment.id}`);
                        }
                    } catch (error) {
                        console.error(`  ✗ Error updating ${assignment.id}:`, error);
                        errors++;
                    }
                }
            }
        }

        console.log(`\n✓ Updated ${updated} assignments`);
        if (errors > 0) {
            console.log(`⚠ Errors: ${errors}`);
        }

        // Now fix attendance records
        console.log('\n=== FIXING ATTENDANCE RELATIONSHIPS ===\n');

        const backupAttendance = backupData.data.training_attendance;
        const currentAttendance = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE)
            .find({})
            .toArray();

        console.log(`Processing ${currentAttendance.length} attendance records...\n`);

        let attendanceUpdated = 0;
        let attendanceErrors = 0;

        for (const attendance of currentAttendance) {
            const backupMatch = backupAttendance.find((a: any) => a.id === attendance.id);

            if (backupMatch) {
                const updates: any = {};

                // Fix teacher_id
                if (backupMatch.teacher_id && backupMatch.teacher_id !== attendance.teacher_id) {
                    updates.teacher_id = backupMatch.teacher_id;
                }

                // Fix training_program_id
                if (backupMatch.training_program_id && backupMatch.training_program_id !== attendance.training_program_id) {
                    updates.training_program_id = backupMatch.training_program_id;
                }

                // Fix assignment_id
                if (backupMatch.assignment_id && backupMatch.assignment_id !== attendance.assignment_id) {
                    updates.assignment_id = backupMatch.assignment_id;
                }

                if (Object.keys(updates).length > 0) {
                    try {
                        await mongodb.getCollection(Collections.TRAINING_ATTENDANCE).updateOne(
                            { id: attendance.id },
                            { $set: updates }
                        );
                        attendanceUpdated++;
                        if (attendanceUpdated <= 5) {
                            console.log(`  ✓ Updated attendance ${attendance.id}`);
                        }
                    } catch (error) {
                        console.error(`  ✗ Error updating ${attendance.id}:`, error);
                        attendanceErrors++;
                    }
                }
            }
        }

        console.log(`\n✓ Updated ${attendanceUpdated} attendance records`);
        if (attendanceErrors > 0) {
            console.log(`⚠ Errors: ${attendanceErrors}`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('=== FIX COMPLETE ===\n');
        console.log(`Total Assignments Updated: ${updated}`);
        console.log(`Total Attendance Updated: ${attendanceUpdated}`);
        console.log('='.repeat(70));
        console.log('\n✅ Data relationships fixed! Reload the app to see changes.\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

fixAssignmentRelationships();
