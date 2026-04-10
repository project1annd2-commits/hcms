const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyC7NL1fvGeSzuPYN4b7QyZC4eaHPBPNsyc",
    authDomain: "hcms-test-c1e7f.firebaseapp.com",
    projectId: "hcms-test-c1e7f",
    storageBucket: "hcms-test-c1e7f.firebasestorage.app",
    messagingSenderId: "36266448653",
    appId: "1:36266448653:web:598731b0eec5a8805d4244",
    measurementId: "G-KWMZE5T428"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const extractedDir = path.join(__dirname, '..', 'extracted');

async function importCollection(collectionName) {
    const filePath = path.join(extractedDir, `${collectionName}.json`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`  - ${collectionName}: file not found`);
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data || data.length === 0) {
        console.log(`  - ${collectionName}: 0 records`);
        return;
    }
    
    const snapshot = await getDocs(collection(db, collectionName));
    const existingIds = new Set(snapshot.docs.map(d => d.id));
    
    const newData = data.filter(d => !existingIds.has(d.id));
    
    if (newData.length === 0) {
        console.log(`  - ${collectionName}: already imported (${data.length})`);
        return;
    }
    
    console.log(`  Importing ${collectionName} (${newData.length} new of ${data.length} total)...`);
    
    const batchSize = 20;
    let batch = writeBatch(db);
    let operationCount = 0;
    let committed = 0;
    
    for (let i = 0; i < newData.length; i++) {
        const item = newData[i];
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
        operationCount++;
        
        if (operationCount >= batchSize || i === newData.length - 1) {
            await batch.commit();
            committed += operationCount;
            console.log(`    - Committed ${operationCount}`);
            batch = writeBatch(db);
            operationCount = 0;
            
            await new Promise(r => setTimeout(r, 15000));
        }
    }
    
    console.log(`  ✓ ${collectionName}: ${committed} imported`);
}

async function main() {
    console.log('Firebase Import (hcms-test-c1e7f)\n');
    console.log('================================\n');
    
    const files = fs.readdirSync(extractedDir).filter(f => f.endsWith('.json') && f !== 'metadata.json');
    
    for (const file of files) {
        const collectionName = file.replace('.json', '');
        
        try {
            await importCollection(collectionName);
            await new Promise(r => setTimeout(r, 5000));
        } catch (error) {
            console.error(`  Error ${collectionName}:`, error.message);
        }
    }
    
    console.log('\n================================');
    console.log('Done!');
}

main().catch(console.error);
