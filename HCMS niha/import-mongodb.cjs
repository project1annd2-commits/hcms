const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://project1annd2_db_user:b6A208ew63yhCvIQ@cluster0.idb1qg5.mongodb.net/?appName=Cluster0';
const dbName = 'hcms_db';

const extractedDir = path.join(__dirname, '..', 'extracted');

async function importCollection(client, collectionName) {
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
    
    console.log(`  Importing ${collectionName} (${data.length} records)...`);
    
    const collection = client.db(dbName).collection(collectionName);
    
    try {
        await collection.deleteMany({});
    } catch (e) {}
    
    if (data.length > 0) {
        await collection.insertMany(data);
    }
    
    console.log(`  ✓ ${collectionName}: ${data.length} records imported`);
}

async function main() {
    console.log('Starting MongoDB import...\n');
    console.log(`Target: ${dbName}`);
    console.log('------------------------\n');
    
    const client = new MongoClient(uri, {
        // MongoDB Atlas requires TLS
        tls: true,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
    });
    
    try {
        await client.connect();
        console.log('Connected to MongoDB\n');
        
        const files = fs.readdirSync(extractedDir).filter(f => f.endsWith('.json') && f !== 'metadata.json');
        
        for (const file of files) {
            const collectionName = file.replace('.json', '');
            try {
                await importCollection(client, collectionName);
            } catch (error) {
                console.error(`  Error ${collectionName}:`, error.message);
            }
        }
        
        console.log('\n------------------------');
        console.log('Import complete!');
    } finally {
        await client.close();
    }
}

main().catch(console.error);
