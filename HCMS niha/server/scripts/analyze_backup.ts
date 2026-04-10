import 'dotenv/config';
import { readFileSync } from 'fs';

async function analyzeBackup() {
    try {
        // Read the backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        
        console.log('Backup file loaded successfully');
        console.log('Root keys:', Object.keys(backupData));
        console.log('Data keys:', Object.keys(backupData.data));
        
        // Check if training_assignments exists as a key
        if (backupData.data.hasOwnProperty('training_assignments')) {
            console.log('Training assignments found:', backupData.data.training_assignments.length);
        } else {
            console.log('Training assignments NOT found as a direct key');
        }
        
        // Check the structure of training_attendance to see if it contains assignment data
        if (backupData.data.training_attendance && backupData.data.training_attendance.length > 0) {
            console.log('Training attendance records:', backupData.data.training_attendance.length);
            console.log('Sample training attendance record:', backupData.data.training_attendance[0]);
            
            // Check if attendance records have assignment data
            const sample = backupData.data.training_attendance[0];
            if (sample.assignment) {
                console.log('Attendance records contain assignment data');
                console.log('Sample assignment data:', sample.assignment);
            }
        }
        
        // Look for any key that might contain assignment data
        Object.keys(backupData.data).forEach(key => {
            if (key.includes('assignment') || key.includes('training')) {
                console.log(`Key "${key}" found with ${Array.isArray(backupData.data[key]) ? backupData.data[key].length : 'non-array'} items`);
            }
        });
        
    } catch (error) {
        console.error('Error analyzing backup:', error);
    }
}

analyzeBackup();