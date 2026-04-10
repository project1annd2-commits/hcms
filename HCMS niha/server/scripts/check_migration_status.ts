import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function checkMigrationStatus() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        console.log('=== DATABASE MIGRATION STATUS ===\n');

        // Check each collection
        const collections = [
            { name: 'Users', collection: Collections.USERS },
            { name: 'Schools', collection: Collections.SCHOOLS },
            { name: 'Teachers', collection: Collections.TEACHERS },
            { name: 'Mentors', collection: Collections.MENTORS },
            { name: 'Training Programs', collection: Collections.TRAINING_PROGRAMS },
            { name: 'Training Attendance', collection: Collections.TRAINING_ATTENDANCE },
            { name: 'Training Assignments', collection: Collections.TRAINING_ASSIGNMENTS },
            { name: 'School Assignments', collection: Collections.SCHOOL_ASSIGNMENTS },
            { name: 'Employee Tasks', collection: Collections.EMPLOYEE_TASKS },
            { name: 'School Followups', collection: Collections.SCHOOL_FOLLOWUPS },
            { name: 'User Devices', collection: Collections.USER_DEVICES },
        ];

        let totalRecords = 0;

        for (const { name, collection } of collections) {
            const count = await mongodb.getCollection(collection).countDocuments();
            console.log(`${name.padEnd(25)}: ${count.toString().padStart(6)} records`);
            totalRecords += count;
        }

        console.log('\n' + '='.repeat(50));
        console.log(`Total Records: ${totalRecords}`);
        console.log('='.repeat(50));

        if (totalRecords > 0) {
            console.log('\n✓ Migration appears to be COMPLETED');
            console.log('✓ Database contains migrated data from Supabase backup\n');
        } else {
            console.log('\n⚠ No data found in MongoDB');
            console.log('⚠ Migration may not have been run yet\n');
        }

    } catch (error) {
        console.error('✗ Error checking migration status:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

checkMigrationStatus();
