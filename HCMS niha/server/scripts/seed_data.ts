import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function seedData() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Seed Schools
        console.log('Seeding schools...');
        const schoolsData = [
            {
                name: 'Springfield Elementary',
                code: 'SPR-001',
                address: '123 Main St, Springfield',
                phone: '555-0101',
                email: 'springfield@example.com',
                h1_count: 200,
                h2_count: 150,
                h3_count: 150,
                principal_name: 'Seymour Skinner',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                name: 'Shelbyville High',
                code: 'SHL-002',
                address: '456 Oak Ave, Shelbyville',
                phone: '555-0102',
                email: 'shelbyville@example.com',
                h1_count: 300,
                h2_count: 250,
                h3_count: 250,
                principal_name: 'Gary Chalmers',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        const schools: any[] = [];
        for (const s of schoolsData) {
            const existing = await db.findOne(Collections.SCHOOLS, { code: s.code });
            if (!existing) {
                const newSchool = await db.insertOne(Collections.SCHOOLS, s);
                schools.push(newSchool);
            } else {
                schools.push(existing);
            }
        }
        console.log(`Seeded ${schools.length} schools`);

        // Seed Mentors
        console.log('Seeding mentors...');
        const mentorsData = [
            {
                first_name: 'Edna',
                last_name: 'Krabappel',
                email: 'edna@example.com',
                phone: '555-1111',
                specialization: 'Mathematics',
                years_of_experience: 15,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        const mentors: any[] = [];
        for (const m of mentorsData) {
            const existing = await db.findOne(Collections.MENTORS, { email: m.email });
            if (!existing) {
                const newMentor = await db.insertOne(Collections.MENTORS, m);
                mentors.push(newMentor);
            } else {
                mentors.push(existing);
            }
        }
        console.log(`Seeded ${mentors.length} mentors`);

        // Seed Teachers
        console.log('Seeding teachers...');
        const teachersData = [
            {
                first_name: 'Seymour',
                last_name: 'Skinner',
                email: 'skinner@example.com',
                phone: '555-2222',
                school_id: schools[0]?.id,
                subject_specialization: 'Administration',
                hire_date: '2010-09-01',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                first_name: 'Elizabeth',
                last_name: 'Hoover',
                email: 'hoover@example.com',
                phone: '555-3333',
                school_id: schools[0]?.id,
                subject_specialization: 'Music',
                hire_date: '2012-09-01',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        let teachersCount = 0;
        for (const t of teachersData) {
            const existing = await db.findOne(Collections.TEACHERS, { email: t.email });
            if (!existing) {
                await db.insertOne(Collections.TEACHERS, t);
                teachersCount++;
            }
        }
        console.log(`Seeded ${teachersCount} teachers`);

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongodb.disconnect();
    }
}

seedData();