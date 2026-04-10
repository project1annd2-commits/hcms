import { db } from '../../src/lib/services/db';
import { Collections } from '../../src/lib/constants';
import * as fs from 'fs';

async function investigateDecemberAttendance() {
    const output: string[] = [];

    try {
        output.push('=== Investigating December Attendance ===\n');

        // Check both 2024 and 2025
        const dates2024 = ['2024-12-25', '2024-12-26', '2024-12-27'];
        const dates2025 = ['2025-12-25', '2025-12-26', '2025-12-27'];
        const allDates = [...dates2024, ...dates2025];

        for (const date of allDates) {
            output.push(`\n--- Attendance for ${date} ---`);

            const attendanceRecords = await db.find(Collections.TRAINING_ATTENDANCE, {
                attendance_date: date
            });

            output.push(`Total Records: ${attendanceRecords.length}`);

            if (attendanceRecords.length > 0) {
                const present = attendanceRecords.filter((r: any) => r.status === 'present' || r.status === 'late');
                const absent = attendanceRecords.filter((r: any) => r.status === 'absent');

                output.push(`Present: ${present.length}`);
                output.push(`Absent: ${absent.length}`);

                if (present.length > 0) {
                    output.push('\nPresent Teachers:');
                    for (const record of present) {
                        const teacher = await db.findById(Collections.TEACHERS, record.teacher_id);
                        const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown';

                        output.push(`  - ${teacherName} (Teacher ID: ${record.teacher_id})`);
                        output.push(`    Status: ${record.status}`);
                        output.push(`    Recorded By ID: ${record.recorded_by || 'N/A'}`);
                        output.push(`    Recorded At: ${record.recorded_at || record.created_at || 'N/A'}`);
                        output.push(`    Training Program ID: ${record.training_program_id || 'N/A'}`);

                        // Get user who recorded
                        if (record.recorded_by) {
                            const user = await db.findById(Collections.USERS, record.recorded_by);
                            if (user) {
                                output.push(`    Recorded By: ${user.full_name} (${user.email})`);
                            }
                        }
                        output.push('');
                    }
                }
            }
        }

        // Write to file
        const outputText = output.join('\n');
        fs.writeFileSync('attendance_investigation_results.txt', outputText);
        console.log('Results written to attendance_investigation_results.txt');
        console.log('\n' + outputText);

    } catch (error) {
        const errorMsg = `Error investigating attendance: ${error}`;
        output.push(errorMsg);
        console.error(errorMsg);
        fs.writeFileSync('attendance_investigation_results.txt', output.join('\n'));
    }
}

investigateDecemberAttendance();
