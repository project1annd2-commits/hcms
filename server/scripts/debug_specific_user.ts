
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

if (!process.env.MONGODB_URI) {
    // Try one level up if we are in server/scripts
    const parentEnvPath = path.resolve(__dirname, '../../.env');
    console.log('Retry loading .env from:', parentEnvPath);
    dotenv.config({ path: parentEnvPath });
}


const uri = process.env.MONGODB_URI;
const PHONE = '9916777753';

async function investigate() {
    if (!uri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('test'); // Assuming 'test' is the db name, checking collections

        // Check Users
        console.log(`\n--- Checking Users for ${PHONE} ---`);
        const user = await db.collection('users').findOne({
            $or: [{ phone: PHONE }, { mobile: PHONE }, { contactNumber: PHONE }]
        });
        console.log('User Record:', user);

        // Check Mentors
        console.log(`\n--- Checking Mentors for ${PHONE} ---`);
        const mentor = await db.collection('mentors').findOne({
            $or: [{ phone: PHONE }, { mobile: PHONE }, { contact_number: PHONE }]
        });
        console.log('Mentor Record:', mentor);

        // Check Mentor Training Assignments
        console.log(`\n--- Checking Mentor Training Assignments for ${PHONE} ---`);
        // Try to find by phone directly if stored, or by mentor ID if we found a mentor
        const mentorAssignmentsByPhone = await db.collection('MENTOR_TRAINING_ASSIGNMENTS').find({
            $or: [{ phone: PHONE }, { mobile: PHONE }]
        }).toArray();
        console.log('Assignments by Phone:', mentorAssignmentsByPhone);

        if (mentor) {
            const mentorAssignmentsById = await db.collection('MENTOR_TRAINING_ASSIGNMENTS').find({
                mentor_id: mentor._id.toString()
            }).toArray();
            console.log('Assignments by Mentor ID:', mentorAssignmentsById);
        }

        // Check Training Assignments (Teachers)
        console.log(`\n--- Checking Training Assignments (Teachers) for ${PHONE} ---`);
        const teacherAssignments = await db.collection('TRAINING_ASSIGNMENTS').find({
            $or: [{ phone: PHONE }, { mobile: PHONE }]
        }).toArray();
        console.log('Teacher Assignments:', teacherAssignments);

        // Check Master Teachers (Employees)
        console.log(`\n--- Checking Employees/Master Teachers for ${PHONE} ---`);
        const employee = await db.collection('employees').findOne({
            $or: [{ phone: PHONE }, { mobile: PHONE }]
        });
        console.log('Employee Record:', employee);


    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

investigate();
