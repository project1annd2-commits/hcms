import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function checkAssignments() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Check training assignments
        const assignments = await db.find('training_assignments', {}, { limit: 10 });
        console.log('\n=== Training Assignments (first 10) ===');
        console.log(`Total assignments: ${await db.count('training_assignments', {})}`);
        console.log(assignments);

        // Check if assignments have proper teacher_id and training_program_id
        if (assignments.length > 0) {
            console.log('\n=== Assignment Details ===');
            assignments.forEach((assignment: any, index: number) => {
                console.log(`Assignment ${index + 1}:`);
                console.log(`  ID: ${assignment.id}`);
                console.log(`  Teacher ID: ${assignment.teacher_id}`);
                console.log(`  Training Program ID: ${assignment.training_program_id}`);
                console.log(`  Status: ${assignment.status}`);
                console.log(`  Progress: ${assignment.progress_percentage}%`);
                console.log('---');
            });
        }

        // Check a specific assignment with related data
        if (assignments.length > 0 && assignments[0].teacher_id) {
            const teacher = await db.findById('teachers', assignments[0].teacher_id);
            console.log('\n=== Sample Teacher Data ===');
            console.log(teacher);

            const program = await db.findById('training_programs', assignments[0].training_program_id);
            console.log('\n=== Sample Training Program Data ===');
            console.log(program);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkAssignments();