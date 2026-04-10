import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
    readFileSync('../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'hcms-680e6'
});

const db = admin.firestore();

async function migrateAttendanceDates() {
    try {
        console.log('🔄 Starting attendance date migration...\n');

        // Query all attendance records with December 2nd, 2025 date
        const attendanceRef = db.collection('training_attendance');

        // Check for both possible date formats for December 2nd, 2025
        const dateFormats = [
            '2025-12-02',
            '2025-12-2',
            '12/02/2025',
            '12/2/2025',
            '2-12-2025',
            '02-12-2025'
        ];

        let totalUpdated = 0;
        const newDate = '2025-12-01';

        console.log('📋 Searching for attendance records on December 2nd, 2025...\n');

        for (const dateFormat of dateFormats) {
            console.log(`🔍 Checking format: ${dateFormat}`);

            const snapshot = await attendanceRef
                .where('attendance_date', '==', dateFormat)
                .get();

            if (snapshot.empty) {
                console.log(`   ℹ️ No records found with this format\n`);
                continue;
            }

            console.log(`   ✅ Found ${snapshot.size} records with this format`);

            // Update each document
            const batch = db.batch();
            let batchCount = 0;
            let batchNumber = 1;

            for (const doc of snapshot.docs) {
                const data = doc.data();
                console.log(`   📝 Updating record: ${doc.id}`);
                console.log(`      Teacher ID: ${data.teacher_id}`);
                console.log(`      Status: ${data.status}`);
                console.log(`      Old Date: ${data.attendance_date} → New Date: ${newDate}`);

                batch.update(doc.ref, {
                    attendance_date: newDate,
                    updated_at: new Date().toISOString()
                });

                batchCount++;
                totalUpdated++;

                // Firestore batch limit is 500 operations
                if (batchCount === 500) {
                    console.log(`\n   💾 Committing batch ${batchNumber} (500 records)...`);
                    await batch.commit();
                    console.log(`   ✅ Batch ${batchNumber} committed successfully\n`);
                    batchNumber++;
                    batchCount = 0;
                }
            }

            // Commit remaining records in batch
            if (batchCount > 0) {
                console.log(`\n   💾 Committing final batch ${batchNumber} (${batchCount} records)...`);
                await batch.commit();
                console.log(`   ✅ Final batch committed successfully\n`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ MIGRATION COMPLETE ✨');
        console.log('='.repeat(60));
        console.log(`📊 Total records updated: ${totalUpdated}`);
        console.log(`📅 All attendance from December 2nd → December 1st, 2025`);
        console.log('='.repeat(60) + '\n');

        // Verify the migration
        console.log('🔍 Verification: Checking for remaining December 2nd records...\n');

        let remainingRecords = 0;
        for (const dateFormat of dateFormats) {
            const verifySnapshot = await attendanceRef
                .where('attendance_date', '==', dateFormat)
                .get();

            if (!verifySnapshot.empty) {
                console.log(`⚠️ Warning: Still found ${verifySnapshot.size} records with format ${dateFormat}`);
                remainingRecords += verifySnapshot.size;
            }
        }

        if (remainingRecords === 0) {
            console.log('✅ Verification passed: No December 2nd records remaining\n');
        } else {
            console.log(`⚠️ Warning: ${remainingRecords} records still have December 2nd dates\n`);
        }

        // Show December 1st count
        const dec1Snapshot = await attendanceRef
            .where('attendance_date', '==', newDate)
            .get();

        console.log(`📊 Total attendance records on December 1st, 2025: ${dec1Snapshot.size}\n`);

    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        // Close the Firebase connection
        await admin.app().delete();
        console.log('🔌 Firebase connection closed');
    }
}

// Run the migration
migrateAttendanceDates()
    .then(() => {
        console.log('\n✅ Migration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration script failed:', error);
        process.exit(1);
    });
