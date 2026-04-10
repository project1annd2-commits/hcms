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

async function checkAttendanceRecords() {
    try {
        console.log('🔍 Checking attendance records...\n');

        // Query all attendance records
        const attendanceRef = db.collection('training_attendance');

        // Get all records (limit to prevent quota issues)
        const snapshot = await attendanceRef.limit(1000).get();

        console.log(`📊 Total records checked (limited to 1000): ${snapshot.size}\n`);

        // Group by date
        const dateMap = new Map<string, number>();

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.attendance_date;
            dateMap.set(date, (dateMap.get(date) || 0) + 1);
        });

        // Show dates
        console.log('📅 Attendance records by date:\n');
        const sortedDates = Array.from(dateMap.entries()).sort();
        sortedDates.forEach(([date, count]) => {
            const marker = (date.includes('12-02') || date.includes('12/2') || date.includes('2025-12-2')) ? ' 👈 FOUND!' : '';
            console.log(`   ${date}: ${count} records${marker}`);
        });

        // Check specifically for December 2nd, 2025
        const dec2Formats = [
            '2025-12-02',
            '2025-12-2',
            '12/02/2025',
            '12/2/2025',
            '2-12-2025',
            '02-12-2025'
        ];

        let totalDec2 = 0;
        console.log('\n🎯 Checking for December 2nd, 2025 records:\n');

        for (const dateFormat of dec2Formats) {
            const count = dateMap.get(dateFormat) || 0;
            if (count > 0) {
                console.log(`   ✅ Found ${count} records with format: ${dateFormat}`);
                totalDec2 += count;
            }
        }

        if (totalDec2 === 0) {
            console.log('   ℹ️ No December 2nd, 2025 records found in the first 1000 records');
            console.log('   📝 Note: There may be more records beyond the 1000 limit\n');
        } else {
            console.log(`\n📊 Total December 2nd records: ${totalDec2}`);
        }

    } catch (error) {
        console.error('❌ Error during check:', error);
        throw error;
    } finally {
        // Close the Firebase connection
        await admin.app().delete();
        console.log('\n🔌 Firebase connection closed');
    }
}

// Run the check
checkAttendanceRecords()
    .then(() => {
        console.log('\n✅ Check completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Check failed:', error);
        process.exit(1);
    });
