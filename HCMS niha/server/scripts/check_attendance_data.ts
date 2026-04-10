import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function checkAttendanceData() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        // Read backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));

        console.log('=== ATTENDANCE DATA CHECK ===\n');

        // Check backup attendance
        const backupAttendance = backupData.data.training_attendance || [];
        const backupReportsAttendance = backupData.reports?.attendance_records || [];

        console.log(`Backup (data.training_attendance): ${backupAttendance.length} records`);
        console.log(`Backup (reports.attendance_records): ${backupReportsAttendance.length} records`);

        // Check MongoDB attendance
        const mongoAttendance = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE)
            .find({}).toArray();

        console.log(`MongoDB (training_attendance): ${mongoAttendance.length} records\n`);

        // Analyze attendance structure
        if (backupAttendance.length > 0) {
            console.log('Sample backup attendance record (from data):');
            console.log(JSON.stringify(backupAttendance[0], null, 2).substring(0, 500));
            console.log('\n');
        }

        if (mongoAttendance.length > 0) {
            console.log('Sample MongoDB attendance record:');
            console.log(JSON.stringify(mongoAttendance[0], null, 2).substring(0, 500));
            console.log('\n');
        }

        // Check for missing records
        const backupIds = new Set(backupAttendance.map((a: any) => a.id));
        const mongoIds = new Set(mongoAttendance.map((a: any) => a.id));

        const missingInMongo = backupAttendance.filter((a: any) => !mongoIds.has(a.id));
        console.log(`Missing attendance records in MongoDB: ${missingInMongo.length}\n`);

        if (missingInMongo.length > 0) {
            console.log('Missing records details (first 5):');
            missingInMongo.slice(0, 5).forEach((record: any, i: number) => {
                console.log(`  ${i + 1}. ID: ${record.id}`);
                console.log(`     Teacher: ${record.teacher_id}`);
                console.log(`     Date: ${record.attendance_date}`);
                console.log(`     Status: ${record.status}`);
                console.log('');
            });
        }

        // Group by date
        const attendanceByDate = new Map<string, number>();
        backupAttendance.forEach((a: any) => {
            const date = a.attendance_date;
            attendanceByDate.set(date, (attendanceByDate.get(date) || 0) + 1);
        });

        console.log('Attendance by date (from backup):');
        const sortedDates = Array.from(attendanceByDate.entries()).sort();
        sortedDates.forEach(([date, count]) => {
            console.log(`  ${date}: ${count} records`);
        });

        // Check MongoDB attendance by date
        const mongoByDate = new Map<string, number>();
        mongoAttendance.forEach((a: any) => {
            const date = a.attendance_date;
            mongoByDate.set(date, (mongoByDate.get(date) || 0) + 1);
        });

        console.log('\nAttendance by date (in MongoDB):');
        const sortedMongoDates = Array.from(mongoByDate.entries()).sort();
        sortedMongoDates.forEach(([date, count]) => {
            console.log(`  ${date}: ${count} records`);
        });

        // Compare
        console.log('\n=== COMPARISON ===\n');
        if (backupAttendance.length === mongoAttendance.length) {
            console.log('✓ Attendance record counts match!');
        } else {
            console.log(`⚠ Mismatch: Backup has ${backupAttendance.length}, MongoDB has ${mongoAttendance.length}`);
        }

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

checkAttendanceData();
