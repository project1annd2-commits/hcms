
import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function checkCounts() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        const schools = await db.count(Collections.SCHOOLS);
        const teachers = await db.count(Collections.TEACHERS);
        const mentors = await db.count(Collections.MENTORS);

        console.log(`Schools: ${schools}`);
        console.log(`Teachers: ${teachers}`);
        console.log(`Mentors: ${mentors}`);

    } catch (error) {
        console.error('Error checking counts:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkCounts();
