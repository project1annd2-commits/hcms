import { MongoClient } from 'mongodb';

const uri = 'mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true';

async function testConnection() {
    console.log('Testing MongoDB connection...');
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully!');
        await client.db('hcms_db').command({ ping: 1 });
        console.log('✅ Ping successful!');
    } catch (error) {
        console.error('❌ Connection failed:', error);
    } finally {
        await client.close();
    }
}

testConnection();
