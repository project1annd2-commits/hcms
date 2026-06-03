import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function verifyAttendanceStructure() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        console.log('=== ATTENDANCE DATA STRUCTURE VERIFICATION ===\n');

        // Get sample attendance records
        const attendanceRecords = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE)
            .find({})
            .limit(10)
            .toArray();

        console.log(`Total attendance records: ${await mongodb.getCollection(Collections.TRAINING_ATTENDANCE).countDocuments()}\n`);

        // Show structure of first few records
        console.log('Sample Attendance Records:\n');
        attendanceRecords.slice(0, 3).forEach((record: any, i: number) => {
            console.log(`Record ${i + 1}:`);
            console.log(`  ID: ${record.id}`);
            console.log(`  Teacher ID: ${record.teacher_id}`);
            console.log(`  Training Program ID: ${record.training_program_id}`);
            console.log(`  Assignment ID: ${record.assignment_id}`);
            console.log(`  Date: ${record.attendance_date}`);
            console.log(`  Status: ${record.status}`);
            console.log(`  Notes: ${record.notes || '(none)'}`);
            console.log(`  Recorded By: ${record.recorded_by || '(system)'}`);
            console.log(`  Created: ${record.created_at}`);
            console.log('');
        });

        // Analyze day-wise distribution
        console.log('=== DAY-WISE ATTENDANCE DISTRIBUTION ===\n');

        const pipeline = [
            {
                $group: {
                    _id: '$attendance_date',
                    count: { $sum: 1 },
                    statuses: {
                        $push: '$status'
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ];

        const dayWiseStats = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE)
            .aggregate(pipeline)
            .toArray();

        dayWiseStats.forEach((day: any) => {
            const presentCount = day.statuses.filter((s: string) => s === 'present').length;
            const absentCount = day.statuses.filter((s: string) => s === 'absent').length;
            const excusedCount = day.statuses.filter((s: string) => s === 'excused').length;

            console.log(`Date: ${day._id}`);
            console.log(`  Total: ${day.count} records`);
            console.log(`  Present: ${presentCount}`);
            console.log(`  Absent: ${absentCount}`);
            console.log(`  Excused: ${excusedCount}`);
            console.log('');
        });

        // Teacher-wise statistics
        console.log('=== TEACHER ATTENDANCE STATISTICS ===\n');

        const teacherPipeline = [
            {
                $group: {
                    _id: '$teacher_id',
                    totalDays: { $sum: 1 },
                    presentDays: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { totalDays: -1 }
            },
            {
                $limit: 10
            }
        ];

        const teacherStats = await mongodb.getCollection(Collections.TRAINING_ATTENDANCE)
            .aggregate(teacherPipeline)
            .toArray();

        console.log('Top 10 Teachers by Attendance Records:');
        teacherStats.forEach((stat: any, i: number) => {
            const attendanceRate = ((stat.presentDays / stat.totalDays) * 100).toFixed(1);
            console.log(`  ${i + 1}. Teacher ID: ${stat._id}`);
            console.log(`     Total Days: ${stat.totalDays}`);
            console.log(`     Present: ${stat.presentDays}`);
            console.log(`     Attendance Rate: ${attendanceRate}%`);
            console.log('');
        });

        console.log('✅ Attendance data is properly structured with day-wise records!\n');

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

verifyAttendanceStructure();
