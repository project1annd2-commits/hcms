import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function checkAttendanceTeachers() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Get all training attendance records
        const attendanceRecords = await db.find(Collections.TRAINING_ATTENDANCE, {});
        console.log(`Total attendance records: ${attendanceRecords.length}`);
        
        // Get unique teacher IDs from attendance records
        const uniqueTeacherIds = [...new Set(attendanceRecords.map((record: any) => record.teacher_id))];
        console.log(`Unique teachers with attendance: ${uniqueTeacherIds.length}`);
        
        // Get unique assignment IDs from attendance records
        const uniqueAssignmentIds = [...new Set(attendanceRecords.map((record: any) => record.assignment_id))];
        console.log(`Unique assignment IDs from attendance: ${uniqueAssignmentIds.length}`);
        
        // Check if these teachers exist in the database
        const existingTeachers = [];
        const missingTeachers = [];
        
        for (const teacherId of uniqueTeacherIds) {
            const teacher = await db.findById(Collections.TEACHERS, teacherId);
            if (teacher) {
                existingTeachers.push(teacher);
            } else {
                missingTeachers.push(teacherId);
            }
        }
        
        console.log(`Existing teachers in DB: ${existingTeachers.length}`);
        console.log(`Missing teachers: ${missingTeachers.length}`);
        
        // Check the training program
        const programs = await db.find(Collections.TRAINING_PROGRAMS, { status: 'active' });
        console.log(`Active training programs: ${programs.length}`);
        
        if (programs.length > 0) {
            console.log(`Program ID: ${programs[0].id}`);
            console.log(`Program title: ${programs[0].title}`);
        }
        
        // Show sample data
        console.log('\n=== Sample Attendance Records ===');
        console.log(attendanceRecords.slice(0, 3));
        
        console.log('\n=== Sample Existing Teachers ===');
        console.log(existingTeachers.slice(0, 3));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkAttendanceTeachers();