import 'dotenv/config';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = 'mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true';
const dbName = 'hcms_db';

async function createTestEmployee() {
    let client;
    try {
        client = new MongoClient(uri);
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        const username = 'test_employee';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            username,
            password_hash: hashedPassword,
            full_name: 'Test Employee',
            role: 'employee',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const existingUser = await usersCollection.findOne({ username });

        if (existingUser) {
            await usersCollection.updateOne({ username }, { $set: { password_hash: hashedPassword, role: 'employee' } });
            console.log('Updated existing test_employee');
        } else {
            await usersCollection.insertOne(user);
            console.log('Created new test_employee');
        }

        console.log('Test employee ready: test_employee / password123');
    } catch (error) {
        console.error('Error creating test employee:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('Disconnected');
        }
        process.exit(0);
    }
}

createTestEmployee();
