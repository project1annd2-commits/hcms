import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('🚀 Starting migration from Backup File to Firebase...');

    // 1. Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ Service account key not found at:', serviceAccountPath);
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();
    console.log('✅ Firebase Admin initialized');

    // 2. Read Backup File
    const backupPath = path.join(__dirname, '../../database-backup-2025-11-24 (1).json');
    if (!fs.existsSync(backupPath)) {
        console.error('❌ Backup file not found at:', backupPath);
        process.exit(1);
    }

    console.log('📦 Reading backup file...');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const data = backupData.data;

    if (!data) {
        console.error('❌ Invalid backup file format: "data" property missing');
        process.exit(1);
    }

    // 3. Migrate Collections
    for (const [collectionName, documents] of Object.entries(data)) {
        if (!Array.isArray(documents)) {
            console.warn(`⚠️ Skipping ${collectionName}: Not an array of documents`);
            continue;
        }

        console.log(`\n📦 Migrating collection: ${collectionName}`);
        const totalDocs = documents.length;
        console.log(`   Found ${totalDocs} documents`);

        if (totalDocs === 0) continue;

        let processed = 0;
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of documents) {
            // Use 'id' or '_id' as the document ID
            const docId = doc.id || doc._id;

            if (!docId) {
                console.warn('   ⚠️ Skipping document without ID:', doc);
                continue;
            }

            // Remove _id if it exists to avoid duplication/confusion in Firestore
            const { _id, ...docData } = doc;

            // Ensure ID is included in the data if it wasn't there (e.g. if we used _id)
            if (!docData.id) {
                docData.id = docId;
            }

            const ref = db.collection(collectionName).doc(String(docId));
            batch.set(ref, docData);
            batchCount++;
            processed++;

            if (batchCount >= 400) {
                await batch.commit();
                console.log(`   Saved ${processed}/${totalDocs} documents...`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }
        console.log(`✅ Finished migrating ${collectionName}`);
    }

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
}

migrate().catch(console.error);
