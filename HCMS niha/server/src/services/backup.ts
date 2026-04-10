import { firebaseAdmin } from './firebase-admin';

export async function generateBackup() {
    try {
        console.log('Starting Firestore backup process...');
        const db = firebaseAdmin.firestore();
        
        // Output format matching previous backup structures
        const backupData: any = {
            data: {}
        };
        
        // List of core collections to backup manually specified for safety
        const collectionsToBackup = [
            'users', 
            'permissions', 
            'schools', 
            'teachers', 
            'mentors', 
            'mentor_schools', 
            'admin_personnel', 
            'training_programs', 
            'training_assignments', 
            'training_attendance', 
            'employee_tasks', 
            'school_followups', 
            'school_assignments', 
            'user_devices',
            'students',
            'student_assessments',
            'implementation_checklists',
            'mom_notes',
            'activity_logs',
            'chat_messages',
            'chat_sessions'
        ];

        for (const collectionName of collectionsToBackup) {
            console.log(`Exporting collection: ${collectionName}...`);
            backupData.data[collectionName] = [];
            
            const snapshot = await db.collection(collectionName).get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Convert Firestore Timestamps to strings for JSON serialization
                for (const key in data) {
                    if (data[key] && typeof data[key].toDate === 'function') {
                        data[key] = data[key].toDate().toISOString();
                    }
                }
                
                backupData.data[collectionName].push({
                    id: doc.id,
                    ...data
                });
            });
            console.log(`✓ Exported ${backupData.data[collectionName].length} documents from ${collectionName}`);
        }

        console.log('Backup generation complete.');
        return backupData;
        
    } catch (error) {
        console.error('Error during Firestore backup:', error);
        throw error;
    }
}
