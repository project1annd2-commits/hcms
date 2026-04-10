import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function importMissingAssignments() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        // Read backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));

        console.log('=== IMPORTING MISSING TRAINING ASSIGNMENTS ===\n');

        // Get assignments from reports section
        const backupAssignments = backupData.reports.active_assignments;
        console.log(`Found ${backupAssignments.length} assignments in backup (reports section)\n`);

        // Get current assignments from MongoDB
        const existingAssignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
            .find({}).toArray();
        console.log(`Current assignments in MongoDB: ${existingAssignments.length}\n`);

        // Find missing assignments
        const existingIds = new Set(existingAssignments.map((a: any) => a.id));
        const missingAssignments = backupAssignments.filter((a: any) => !existingIds.has(a.id));

        console.log(`Missing assignments to import: ${missingAssignments.length}\n`);

        if (missingAssignments.length === 0) {
            console.log('✓ No missing assignments found. Database is up to date!');
            return;
        }

        // Convert and insert missing assignments
        console.log('Importing missing assignments in batches...\n');

        const batchSize = 50;
        let imported = 0;

        for (let i = 0; i < missingAssignments.length; i += batchSize) {
            const batch = missingAssignments.slice(i, i + batchSize);

            // Convert from backup format to MongoDB format
            const convertedBatch = batch.map((assignment: any) => {
                // Clean up the assignment data
                const cleanAssignment: any = {
                    id: assignment.id,
                    training_program_id: assignment.training_program_id || assignment.training_program?.id,
                    teacher_id: assignment.teacher_id || assignment.teacher?.id,
                    assigned_date: assignment.assigned_date ? new Date(assignment.assigned_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    due_date: assignment.due_date ? new Date(assignment.due_date).toISOString().split('T')[0] : null,
                    completion_date: assignment.completion_date ? new Date(assignment.completion_date).toISOString().split('T')[0] : null,
                    status: assignment.status || 'assigned',
                    progress_percentage: assignment.progress_percentage || 0,
                    score: assignment.score || null,
                    assigned_by: assignment.assigned_by || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                return cleanAssignment;
            });

            try {
                await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).insertMany(convertedBatch);
                imported += batch.length;
                console.log(`  ✓ Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingAssignments.length / batchSize)} (${imported}/${missingAssignments.length})`);
            } catch (error) {
                console.error(`  ✗ Error importing batch ${Math.floor(i / batchSize) + 1}:`, error);
            }
        }

        console.log(`\n✓ Successfully imported ${imported} missing assignments!\n`);

        // Verify final count
        const finalCount = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).countDocuments();
        console.log(`Final assignment count: ${finalCount}`);
        console.log(`Expected count: 165`);

        if (finalCount === 165) {
            console.log('\n✓✓✓ SUCCESS! All 165 assignments are now in the database! ✓✓✓\n');
        } else {
            console.log(`\n⚠ Warning: Count mismatch. Expected 165, got ${finalCount}\n`);
        }

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

importMissingAssignments();
