import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restoreFromBackup() {
    console.log('🚀 Starting Firebase restoration from backup...');
    console.log('⚠️  WARNING: This will DELETE all existing data in Firebase!\n');

    // 1. Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
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
    const backupPath = path.join(__dirname, '../../database-backup-2025-11-26.json');
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

    console.log(`📊 Backup info:`);
    console.log(`   Date: ${backupData.backup_date}`);
    console.log(`   Version: ${backupData.version}\n`);

    // 3. Clear existing collections first
    console.log('🗑️  STEP 1: Clearing existing collections...\n');

    for (const collectionName of Object.keys(data)) {
        if (collectionName === 'permissions' && data[collectionName].error) {
            console.log(`⚠️  Skipping ${collectionName}: Has error in backup`);
            continue;
        }

        const documents = data[collectionName];
        if (!Array.isArray(documents)) {
            console.warn(`⚠️  Skipping ${collectionName}: Not an array of documents`);
            continue;
        }

        try {
            console.log(`🗑️  Clearing collection: ${collectionName}`);
            const collectionRef = db.collection(collectionName);
            const snapshot = await collectionRef.get();

            if (snapshot.empty) {
                console.log(`   Already empty (0 documents)`);
                continue;
            }

            let deletedCount = 0;
            let batch = db.batch();
            let batchCount = 0;

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                batchCount++;
                deletedCount++;

                if (batchCount >= 400) {
                    batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            });

            if (batchCount > 0) {
                await batch.commit();
            }

            console.log(`✅ Deleted ${deletedCount} documents from ${collectionName}`);
        } catch (error) {
            console.error(`❌ Error clearing ${collectionName}:`, error);
        }
    }

    console.log('\n📥 STEP 2: Importing data from backup...\n');

    // 4. Import Collections from Backup
    let totalImported = 0;
    const importStats: Record<string, number> = {};

    for (const [collectionName, documents] of Object.entries(data)) {
        // Skip permissions if it has an error
        if (collectionName === 'permissions' && (documents as any).error) {
            console.log(`⚠️  Skipping ${collectionName}: Has error in backup`);
            continue;
        }

        if (!Array.isArray(documents)) {
            console.warn(`⚠️  Skipping ${collectionName}: Not an array of documents`);
            continue;
        }

        console.log(`\n📦 Importing collection: ${collectionName}`);
        const totalDocs = documents.length;
        console.log(`   Documents to import: ${totalDocs}`);

        if (totalDocs === 0) {
            console.log(`   Skipping empty collection`);
            continue;
        }

        let processed = 0;
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of documents) {
            // Use 'id' or '_id' as the document ID
            const docId = doc.id || doc._id;

            if (!docId) {
                console.warn('   ⚠️  Skipping document without ID');
                continue;
            }

            // Remove _id if it exists to avoid duplication
            const { _id, ...docData } = doc;

            // Ensure ID is included in the data
            if (!docData.id) {
                docData.id = docId;
            }

            const ref = db.collection(collectionName).doc(String(docId));
            batch.set(ref, docData);
            batchCount++;
            processed++;

            if (batchCount >= 400) {
                await batch.commit();
                console.log(`   Progress: ${processed}/${totalDocs} documents...`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`✅ Imported ${processed} documents to ${collectionName}`);
        importStats[collectionName] = processed;
        totalImported += processed;
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 RESTORATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Import Summary:`);
    console.log(`   Total documents imported: ${totalImported}`);
    console.log(`\n📋 Collections restored:`);

    for (const [collection, count] of Object.entries(importStats)) {
        console.log(`   - ${collection}: ${count} documents`);
    }

    console.log('\n✅ All data has been restored from backup');
    console.log('💡 You can now verify the data in Firebase Console\n');

    process.exit(0);
}

restoreFromBackup().catch((error) => {
    console.error('\n❌ Restoration failed:', error);
    process.exit(1);
});
