import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function debugAssignmentIds() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Get a sample assignment
        const assignments = await db.find(Collections.TRAINING_ASSIGNMENTS, {}, { limit: 5 });
        console.log('Sample assignments:');
        console.log(assignments);

        // Get a sample teacher
        const teachers = await db.find(Collections.TEACHERS, {}, { limit: 5 });
        console.log('\nSample teachers:');
        console.log(teachers);

        // Get the training program
        const programs = await db.find(Collections.TRAINING_PROGRAMS, {});
        console.log('\nTraining programs:');
        console.log(programs);

        // Check if any assignment teacher_id matches any teacher id
        console.log('\n=== Checking ID Matches ===');
        const assignmentTeacherIds = assignments.map((a: any) => a.teacher_id);
        const teacherIds = teachers.map((t: any) => t.id);
        
        console.log('Assignment teacher IDs:', assignmentTeacherIds);
        console.log('Database teacher IDs:', teacherIds);
        
        // Check for matches
        const matches = assignmentTeacherIds.filter((id: string) => teacherIds.includes(id));
        console.log('Matching IDs:', matches);
        
        // Check program IDs
        const assignmentProgramIds = assignments.map((a: any) => a.training_program_id);
        const programIds = programs.map((p: any) => p.id);
        
        console.log('Assignment program IDs:', assignmentProgramIds);
        console.log('Database program IDs:', programIds);
        
        const programMatches = assignmentProgramIds.filter((id: string) => programIds.includes(id));
        console.log('Matching program IDs:', programMatches);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

debugAssignmentIds();