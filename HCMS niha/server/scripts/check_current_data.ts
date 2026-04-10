import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function checkCurrentData() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        console.log('=== CURRENT DATABASE STATUS ===\n');

        // Get counts
        const assignmentCount = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).countDocuments();
        const attendanceCount = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE).countDocuments();

        console.log(`Training Assignments: ${assignmentCount}`);
        console.log(`Training Attendance: ${attendanceCount}\n`);

        // Sample some assignments
        console.log('Sample Training Assignments (first 5):');
        const sampleAssignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .find({})
            .limit(5)
            .toArray();

        sampleAssignments.forEach((assignment: any, i: number) => {
            console.log(`  ${i + 1}. ID: ${assignment.id || assignment._id}`);
            console.log(`     Teacher ID: ${assignment.teacher_id}`);
            console.log(`     Program ID: ${assignment.program_id}`);
            console.log(`     Status: ${assignment.status}`);
            console.log(`     Assigned Date: ${assignment.assigned_date}`);
            console.log('');
        });

        // Check for duplicates
        const allAssignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .find({})
            .toArray();

        const ids = allAssignments.map((a: any) => a.id);
        const uniqueIds = new Set(ids);

        if (ids.length !== uniqueIds.size) {
            console.log(`⚠ Found ${ids.length - uniqueIds.size} duplicate assignments`);
        } else {
            console.log(`✓ No duplicate assignments found`);
        }

        // Check all collections
        console.log('\n=== ALL COLLECTIONS ===\n');
        const collections = [
            'users', 'schools', 'teachers', 'mentors',
            'training_programs', 'training_assignments', 'training_attendance',
            'school_assignments', 'employee_tasks', 'school_followups', 'user_devices'
        ];

        for (const collName of collections) {
            const count = await mongodb.getCollection(collName).countDocuments();
            console.log(`${collName.padEnd(25)}: ${count}`);
        }

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkCurrentData();
