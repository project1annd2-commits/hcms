import 'dotenv/config';
import { readFileSync } from 'fs';

async function analyzeTeacherMapping() {
    try {
        // Read the backup file to see if we can find a mapping
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        
        console.log('=== Backup Data Analysis ===');
        console.log(`Total teachers in backup: ${backupData.data.teachers.length}`);
        console.log(`Total attendance records in backup: ${backupData.data.training_attendance.length}`);
        
        // Get unique teacher IDs from attendance records in backup
        const attendanceTeacherIds = [...new Set(backupData.data.training_attendance.map((record: any) => record.teacher_id))];
        console.log(`Unique teacher IDs in attendance: ${attendanceTeacherIds.length}`);
        
        // Check if these teachers exist in the backup
        const attendanceTeachers = backupData.data.teachers.filter((teacher: any) => 
            attendanceTeacherIds.includes(teacher.id)
        );
        
        console.log(`Teachers with attendance records in backup: ${attendanceTeachers.length}`);
        
        // Show sample
        console.log('\n=== Sample Teachers with Attendance ===');
        console.log(attendanceTeachers.slice(0, 3));
        
        // Show sample attendance records
        console.log('\n=== Sample Attendance Records ===');
        console.log(backupData.data.training_attendance.slice(0, 3));

    } catch (error) {
        console.error('Error analyzing teacher mapping:', error);
    }
}

analyzeTeacherMapping();