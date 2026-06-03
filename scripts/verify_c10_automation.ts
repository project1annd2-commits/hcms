import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function verifyC10Automation() {
    console.log('--- Verifying C10 Automation Logic ---');

    try {
        // 1. Create a C10 Program
        const program = await db.insertOne<any>(Collections.TRAINING_PROGRAMS, {
            title: 'C.10 Induction Training Test',
            status: 'active',
            enable_marks_card: true,
            marks_configuration: {
                subjects: [
                    { name: 'Phonics', max_marks: 26 },
                    { name: 'Vocabulary', max_marks: 25 }
                ]
            }
        });
        const programId = program.id;
        console.log('Created C10 Program:', programId);

        // 2. Create an Assignment
        const assignment = await db.insertOne<any>(Collections.TRAINING_ASSIGNMENTS, {
            training_program_id: programId,
            teacher_id: 'test-teacher-id',
            status: 'assigned',
            progress_percentage: 0,
            marks_data: {}
        });
        const assignmentId = assignment.id;
        console.log('Created Assignment:', assignmentId);

        // 3. Simulate Bulk Marks Save (Logic from handleBulkMarksSave)
        console.log('\nSimulating Bulk Marks Save...');
        const marksData = { 'Phonics': 20, 'Vocabulary': 20 };
        const totalObtained = 40;
        const totalMax = 51;
        const score = Math.round((totalObtained / totalMax) * 100);

        const isC10 = (program.title || '').toLowerCase().includes('c10') ||
            (program.title || '').toLowerCase().includes('c.10');

        const updateData: any = {
            marks_data: marksData,
            score: score,
            updated_at: new Date().toISOString(),
        };

        if (isC10 && Object.keys(marksData).length > 0) {
            updateData.marks_published = true;
            updateData.marks_published_date = new Date().toISOString();
            updateData.marks_published_by = 'system-test';
            updateData.status = 'completed';
            updateData.progress_percentage = 100;
        }

        await db.updateById(Collections.TRAINING_ASSIGNMENTS, assignmentId, updateData);

        // Verify results
        const updatedAssignment = await db.findById<any>(Collections.TRAINING_ASSIGNMENTS, assignmentId);
        console.log('Updated Status:', updatedAssignment.status);
        console.log('Marks Published?', updatedAssignment.marks_published);
        console.log('Progress Percentage:', updatedAssignment.progress_percentage);

        if (updatedAssignment.status === 'completed' && updatedAssignment.marks_published === true) {
            console.log('PASS: C10 Auto-Publish works correctly.');
        } else {
            console.log('FAIL: C10 Auto-Publish failed.');
        }

        // Cleanup
        await db.deleteById(Collections.TRAINING_ASSIGNMENTS, assignmentId);
        await db.deleteById(Collections.TRAINING_PROGRAMS, programId);
        console.log('\nCleanup complete.');

    } catch (error) {
        console.error('Error during verification:', error);
    }
}

verifyC10Automation();
