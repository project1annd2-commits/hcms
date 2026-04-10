import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';

async function checkTrainingData() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Check training assignments
        const assignments = await db.find('training_assignments', {}, { limit: 10 });
        console.log('\n=== Training Assignments (first 10) ===');
        console.log(`Total assignments: ${await db.count('training_assignments', {})}`);
        console.log(assignments);

        // Check training attendance
        const attendance = await db.find('training_attendance', {}, { limit: 10 });
        console.log('\n=== Training Attendance (first 10) ===');
        console.log(`Total attendance records: ${await db.count('training_attendance', {})}`);
        console.log(attendance);

        // Check training programs
        const programs = await db.find('training_programs', {}, { limit: 10 });
        console.log('\n=== Training Programs (first 10) ===');
        console.log(`Total programs: ${await db.count('training_programs', {})}`);
        console.log(programs);

        // Check teachers
        const teachers = await db.find('teachers', {}, { limit: 10 });
        console.log('\n=== Teachers (first 10) ===');
        console.log(`Total teachers: ${await db.count('teachers', {})}`);
        console.log(teachers);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkTrainingData();