import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debugNazeera() {
    const report: any = {
        teacher: null,
        assignments: []
    };

    try {
        const teachers = await db.find<any>(Collections.TEACHERS, { phone: '9940422850' });
        if (teachers.length > 0) {
            const teacher = teachers[0];
            report.teacher = { id: teacher.id, name: `${teacher.first_name} ${teacher.last_name}` };

            const assignments = await db.find<any>(Collections.TRAINING_ASSIGNMENTS, { teacher_id: teacher.id });
            for (const a of assignments) {
                const program = await db.findById<any>(Collections.TRAINING_PROGRAMS, a.training_program_id);
                const allAttendance = await db.find<any>(Collections.TRAINING_ATTENDANCE, { assignment_id: a.id });

                let presentCount = 0;
                const dailyAttendance = allAttendance.map(att => {
                    if (att.status === 'present' || att.status === 'late') presentCount++;
                    return { date: att.attendance_date, status: att.status };
                });

                const totalDays = 16;
                const percentage = Math.round((presentCount / totalDays) * 100);

                report.assignments.push({
                    program_title: program?.title,
                    enable_marks_card: program?.enable_marks_card,
                    marks_published: a.marks_published,
                    marks_data: a.marks_data,
                    present_count: presentCount,
                    total_records: allAttendance.length,
                    calculated_percentage: percentage,
                    daily_attendance: dailyAttendance
                });
            }
        }

        console.log('REPORTE_JSON_START');
        console.log(JSON.stringify(report, null, 2));
        console.log('REPORTE_JSON_END');

    } catch (error) {
        console.error('Error:', error);
    }
}

debugNazeera();
