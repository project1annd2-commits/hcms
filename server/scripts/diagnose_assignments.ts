import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function diagnoseAssignmentIssues() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');
        console.log('=== DIAGNOSING ASSIGNMENT ISSUES ===\n');

        // Check sample assignments
        const assignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .find({})
            .limit(5)
            .toArray();

        console.log('Sample Assignments:');
        assignments.forEach((a: any, i: number) => {
            console.log(`\n${i + 1}. Assignment ID: ${a.id}`);
            console.log(`   Teacher ID: ${a.teacher_id}`);
            console.log(`   Program ID: ${a.training_program_id || a.program_id || 'MISSING'}`);
            console.log(`   Status: ${a.status}`);
            console.log(`   Assigned Date: ${a.assigned_date}`);
        });

        // Check if teachers have school_id
        console.log('\n\n=== CHECKING TEACHER DATA ===\n');
        const teachers = await mongodb.getCollection(Collections.TEACHERS)
            .find({})
            .limit(5)
            .toArray();

        teachers.forEach((t: any, i: number) => {
            console.log(`${i + 1}. Teacher ID: ${t.id}`);
            console.log(`   Name: ${t.first_name} ${t.last_name}`);
            console.log(`   School ID: ${t.school_id || 'MISSING'}`);
            console.log('');
        });

        // Check for assignments with missing program_id
        const missingProgramId = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .countDocuments({
                $or: [
                    { training_program_id: null },
                    { training_program_id: { $exists: false } }
                ]
            });

        console.log(`\nAssignments with missing program_id: ${missingProgramId}`);

        // Check attendance records
        console.log('\n\n=== CHECKING ATTENDANCE DATA ===\n');
        const attendance = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE)
            .find({})
            .limit(3)
            .toArray();

        attendance.forEach((a: any, i: number) => {
            console.log(`${i + 1}. Attendance ID: ${a.id}`);
            console.log(`   Teacher ID: ${a.teacher_id}`);
            console.log(`   Program ID: ${a.training_program_id || 'MISSING'}`);
            console.log(`   Assignment ID: ${a.assignment_id || 'MISSING'}`);
            console.log(`   Date: ${a.attendance_date}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

diagnoseAssignmentIssues();
