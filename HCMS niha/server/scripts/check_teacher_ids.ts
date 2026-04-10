import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function checkTeacherIds() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        // Get teachers from MongoDB
        const teachers = await mongodb.getCollection(Collections.TEACHERS)
            .find({}).limit(5).toArray();

        console.log('Sample Teachers from MongoDB:');
        teachers.forEach((t: any, i: number) => {
            console.log(`  ${i + 1}. id: ${t.id}`);
            console.log(`     _id: ${t._id}`);
            console.log(`     name: ${t.first_name} ${t.last_name}`);
            console.log('');
        });

        // Get assignments
        const assignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .find({}).limit(3).toArray();

        console.log('Sample Assignments from MongoDB:');
        assignments.forEach((a: any, i: number) => {
            console.log(`  ${i + 1}. id: ${a.id}`);
            console.log(`     teacher_id: ${a.teacher_id}`);
            console.log('');
        });

        // Try to find a match
        const firstAssignment = assignments[0];
        const matchingTeacher = teachers.find((t: any) => t.id === firstAssignment.teacher_id);

        console.log('Matching test:');
        console.log(`  Assignment teacher_id: ${firstAssignment.teacher_id}`);
        console.log(`  Match found: ${matchingTeacher ? 'YES - ' + matchingTeacher.first_name : 'NO'}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

checkTeacherIds();
