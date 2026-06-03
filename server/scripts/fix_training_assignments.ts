import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function fixTrainingAssignments() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Clear existing training assignments
        await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).deleteMany({});
        console.log('Cleared existing training assignments');

        // Get all teachers and training programs
        const teachers = await db.find(Collections.TEACHERS, { status: 'active' });
        const programs = await db.find(Collections.TRAINING_PROGRAMS, { status: 'active' });
        
        console.log(`Found ${teachers.length} teachers and ${programs.length} active programs`);
        
        if (programs.length === 0) {
            console.log('No active training programs found. Cannot create assignments.');
            return;
        }
        
        const program = programs[0]; // Use the first active program
        
        // Create training assignments for all teachers
        const assignmentsToCreate = teachers.map((teacher: any, index: number) => {
            return {
                training_program_id: program.id,
                teacher_id: teacher.id,
                assigned_date: new Date().toISOString().split('T')[0],
                due_date: null,
                completion_date: null,
                status: 'assigned' as const,
                progress_percentage: 0,
                score: null,
                assigned_by: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        });
        
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
        console.log('\n=== Sample Assignments with Teacher/Program Data ===');
        
        for (const assignment of sampleAssignments) {
            const teacher = await db.findById(Collections.TEACHERS, assignment.teacher_id);
            const program = await db.findById(Collections.TRAINING_PROGRAMS, assignment.training_program_id);
            
            console.log(`Assignment ID: ${assignment.id}`);
            console.log(`  Teacher: ${teacher?.first_name} ${teacher?.last_name} (${assignment.teacher_id})`);
            console.log(`  Program: ${program?.title} (${assignment.training_program_id})`);
            console.log(`  Status: ${assignment.status}`);
            console.log('---');
        }

    } catch (error) {
        console.error('Error fixing training assignments:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

fixTrainingAssignments();