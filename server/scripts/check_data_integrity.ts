import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function checkDataIntegrity() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        // Read backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));

        console.log('=== DATA INTEGRITY CHECK ===\n');
        console.log('Backup Date:', backupData.backup_date);
        console.log('\n' + '='.repeat(80));
        console.log('Collection'.padEnd(30) + 'Backup'.padStart(12) + 'MongoDB'.padStart(12) + 'Missing'.padStart(12) + 'Status'.padStart(14));
        console.log('='.repeat(80));

        const collections = [
            { name: 'users', label: 'Users' },
            { name: 'schools', label: 'Schools' },
            { name: 'teachers', label: 'Teachers' },
            { name: 'mentors', label: 'Mentors' },
            { name: 'training_programs', label: 'Training Programs' },
            { name: 'training_assignments', label: 'Training Assignments' },
            { name: 'training_attendance', label: 'Training Attendance' },
            { name: 'school_assignments', label: 'School Assignments' },
            { name: 'employee_tasks', label: 'Employee Tasks' },
            { name: 'school_followups', label: 'School Followups' },
            { name: 'user_devices', label: 'User Devices' },
        ];

        let hasIssues = false;

        for (const { name, label } of collections) {
            const backupCount = Array.isArray(backupData.data[name])
                ? backupData.data[name].length
                : 0;
            const mongoCount = await mongodb.getCollection(name).countDocuments();

            const missing = backupCount - mongoCount;
            const status = missing === 0 ? '✓ OK' : missing > 0 ? '⚠ INCOMPLETE' : '⚠ EXTRA DATA';

            if (missing !== 0) hasIssues = true;

            console.log(
                label.padEnd(30) +
                backupCount.toString().padStart(12) +
                mongoCount.toString().padStart(12) +
                missing.toString().padStart(12) +
                status.padStart(14)
            );
        }

        console.log('='.repeat(80));

        if (hasIssues) {
            console.log('\n⚠ ISSUES DETECTED - Investigating missing data...\n');

            // Check training assignments specifically
            const backupAssignments = backupData.data.training_assignments;
            const mongoAssignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).find({}).toArray();

            console.log('Training Assignments Details:');
            console.log('- Backup has:', backupAssignments.length, 'records');
            console.log('- MongoDB has:', mongoAssignments.length, 'records');
            console.log('- Missing:', backupAssignments.length - mongoAssignments.length, 'records\n');

            // Find missing assignment IDs
            const mongoIds = new Set(mongoAssignments.map((a: any) => a.id));
            const missingAssignments = backupAssignments.filter((a: any) => !mongoIds.has(a.id));

            if (missingAssignments.length > 0) {
                console.log('Missing Assignment IDs (first 10):');
                missingAssignments.slice(0, 10).forEach((a: any, i: number) => {
                    console.log(`  ${i + 1}. ID: ${a.id}, Teacher: ${a.teacher_id}, Program: ${a.program_id}`);
                });

                if (missingAssignments.length > 10) {
                    console.log(`  ... and ${missingAssignments.length - 10} more`);
                }
            }

            // Check training attendance
            const backupAttendance = backupData.data.training_attendance;
            const mongoAttendance = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE).find({}).toArray();

            console.log('\nTraining Attendance Details:');
            console.log('- Backup has:', backupAttendance.length, 'records');
            console.log('- MongoDB has:', mongoAttendance.length, 'records');
            console.log('- Missing:', backupAttendance.length - mongoAttendance.length, 'records\n');

        } else {
            console.log('\n✓ All data successfully migrated!\n');
        }

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkDataIntegrity();
