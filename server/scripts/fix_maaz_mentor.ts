
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to find .env file
function loadEnv() {
    const searchPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve('C:\\Users\\Hauna\\Downloads\\project-bolt-sb1-gqfzf2es (6)\\project\\.env')
    ];
    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            dotenv.config({ path: p });
            if (process.env.MONGODB_URI) return true;
        }
    }
    return false;
}
loadEnv();

const uri = process.env.MONGODB_URI;
const PHONE = '9916777753';
const SCHOOL_NAME = 'CMA School';
const MENTOR_NAME = 'Maaz l';

async function fix() {
    if (!uri) process.exit(1);
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME || 'test');

        // 1. Check Teachers
        console.log('Checking Teachers...');
        const teacher = await db.collection('teachers').findOne({ phone: PHONE });
        if (teacher) {
            console.log('WARN: Found in TEACHERS collection:', teacher);
        } else {
            console.log('Not found in teachers.');
        }

        // 2. Find School
        console.log(`Finding School '${SCHOOL_NAME}'...`);
        const schools = await db.collection('schools').find({}).toArray();
        // Fuzzy match school name
        const school = schools.find(s => s.name.toLowerCase().includes('cma school'.toLowerCase()));

        if (!school) {
            console.error('School NOT found. Available schools:', schools.map(s => s.name).slice(0, 5));
            return;
        }
        console.log('Found School:', school.name, school.id);

        // 3. Create Mentor
        console.log(`Creating/Updating Mentor '${MENTOR_NAME}'...`);
        // Check if mentor exists by phone (we know it doesn't) OR by name?
        // Let's rely on phone. Since strictly not found, we create.

        const newMentor = {
            first_name: 'Maaz',
            last_name: 'l',
            phone: PHONE,
            email: 'maaz.l@example.com', // placeholder
            school_id: school.id,
            status: 'active',
            specialization: 'General',
            years_of_experience: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const res = await db.collection('mentors').updateOne(
            { phone: PHONE },
            { $setOnInsert: newMentor },
            { upsert: true }
        );

        console.log('Mentor Upsert Result:', res);

        // Fetch the new mentor to get ID
        const mentor = await db.collection('mentors').findOne({ phone: PHONE });
        const mentorId = mentor?.id || mentor?._id.toString();
        console.log('Mentor ID:', mentorId);

        // 4. Check/Create Assignment
        // "Online Mentors' Training-B4"
        const PROGRAM_NAME = "Online Mentors' Training-B4";
        const program = await db.collection('training_programs').findOne({ title: PROGRAM_NAME });

        if (!program) {
            console.log(`Program '${PROGRAM_NAME}' not found. Listing all:`);
            const allProgs = await db.collection('training_programs').find({}).toArray();
            allProgs.forEach(p => console.log(`- ${p.title}`));
        } else {
            console.log('Found Program:', program.title, program.id);

            // Assign
            await db.collection('mentor_training_assignments').updateOne(
                {
                    mentor_id: mentorId,
                    training_program_id: program.id
                },
                {
                    $set: {
                        status: 'assigned',
                        assigned_date: new Date().toISOString().split('T')[0],
                        // progress_percentage: 0 // Don't reset if exists
                    },
                    $setOnInsert: {
                        created_at: new Date().toISOString(),
                        progress_percentage: 0,
                        assigned_by: 'system_debug'
                    }
                },
                { upsert: true }
            );
            console.log('Assignment ensured.');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}

fix();
