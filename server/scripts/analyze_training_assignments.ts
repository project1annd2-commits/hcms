import 'dotenv/config';
import { readFileSync } from 'fs';

async function analyzeTrainingAssignments() {
    try {
        // Read the backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        
        console.log('Training assignments data type:', typeof backupData.data.training_assignments);
        console.log('Training assignments data:', backupData.data.training_assignments);
        
        // Check if it's an object with error information
        if (typeof backupData.data.training_assignments === 'object' && backupData.data.training_assignments !== null) {
            if (backupData.data.training_assignments.error) {
                console.log('Training assignments error:', backupData.data.training_assignments.error);
            } else {
                console.log('Training assignments keys:', Object.keys(backupData.data.training_assignments));
            }
        }
        
    } catch (error) {
        console.error('Error analyzing training assignments:', error);
    }
}

analyzeTrainingAssignments();