
import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function checkUsers() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        const users = await db.find(Collections.USERS, {});
        console.log(`Found ${users.length} users`);

        users.forEach(user => {
            console.log(`User: ${user.username}, Role: ${user.role}, Active: ${user.is_active}`);
        });

        if (users.length === 0) {
            console.log('No users found. You may need to seed the database.');
        }

    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkUsers();
