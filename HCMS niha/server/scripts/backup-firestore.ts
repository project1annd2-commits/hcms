import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Define the path to your service account key
const serviceAccountPath = path.resolve(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');

// Check if already initialized to avoid errors in dev reloading
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(require(serviceAccountPath)),
            databaseURL: "https://hcms-680e6.firebaseio.com"
        });
    } catch (e) {
        console.error('Failed to initialize Firebase Admin SDK. Make sure the service account file exists and is valid.', e);
    }
}

export async function generateBackup() {
    try {
        console.log('Starting Firestore backup process...');
        const db = admin.firestore();
        
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

// Allow running this script directly from command line
if (require.main === module) {
    generateBackup().then(rawBackup => {
        const timestamp = new Date().toISOString().split('T')[0];
        const outputPath = path.resolve(__dirname, `../../database-backup-${timestamp}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(rawBackup, null, 2));
        console.log(`Backup saved to ${outputPath}`);
        process.exit(0);
    }).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
