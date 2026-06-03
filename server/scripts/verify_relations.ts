import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function verifyDataRelations() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        // Get sample assignment
        const assignment = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .findOne({});

        console.log('Sample Assignment:');
        console.log(`  ID: ${assignment.id}`);
        console.log(`  Teacher ID: ${assignment.teacher_id}`);
        console.log(`  Program ID: ${assignment.training_program_id}\n`);

        // Find matching teacher
        const teacher = await mongodb.getCollection(Collections.TEACHERS)
            .findOne({ id: assignment.teacher_id });

        if (teacher) {
            console.log('✅ Teacher FOUND:');
            console.log(`  Name: ${teacher.first_name} ${teacher.last_name}`);
            console.log(`  School ID: ${teacher.school_id}\n`);

            // Find school
            const school = await mongodb.getCollection(Collections.SCHOOLS)
                .findOne({ id: teacher.school_id });

            if (school) {
                console.log('✅ School FOUND:');
                console.log(`  Name: ${school.name}\n`);
            } else {
                console.log('❌ School NOT FOUND for school_id:', teacher.school_id, '\n');
            }
        } else {
            console.log('❌ Teacher NOT FOUND for teacher_id:', assignment.teacher_id, '\n');
            console.log('Checking if this is an ObjectID vs UUID issue...\n');

            // Check all teachers
            const allTeachers = await mongodb.getCollection(Collections.TEACHERS)
                .find({}).limit(3).toArray();

            console.log('Sample teacher IDs in database:');
            allTeachers.forEach((t: any, i: number) => {
                console.log(`  ${i + 1}. ${t.id} (${t.first_name} ${t.last_name})`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

verifyDataRelations();
