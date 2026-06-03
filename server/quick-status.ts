import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function quickCheck() {
    try {
        await mongodb.connect();

        const assignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).countDocuments();
        const attendance = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE).countDocuments();

        console.log('\n=== CURRENT DATABASE STATUS ===\n');
        console.log(`✅ Training Assignments: ${assignments}`);
        console.log(`✅ Training Attendance:  ${attendance}\n`);

        if (assignments === 165 && attendance === 558) {
            console.log('🎉 PERFECT! All data is already restored:\n');
            console.log('  ✓ 165/165 training assignments (100%)');
            console.log('  ✓ 558/558 attendance records (100%)\n');
            console.log('No action needed - database is complete!\n');
        } else if (assignments === 131) {
            console.log('⚠ Missing 34 assignments. Run: npx tsx scripts/import_missing_assignments.ts\n');
        } else {
            console.log(`Current: ${assignments} assignments, ${attendance} attendance records\n`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

quickCheck();
