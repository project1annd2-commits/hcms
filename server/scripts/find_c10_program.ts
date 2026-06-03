
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://skool:skool123@cluster0.7l25n.mongodb.net/skool?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = process.env.DB_NAME || 'skool';

async function findC10Program() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(DB_NAME);

        const programs = await db.collection('training_programs').find({
            title: { $regex: 'C10', $options: 'i' }
        }).toArray();

        console.log('Found Programs:', JSON.stringify(programs, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

findC10Program();
