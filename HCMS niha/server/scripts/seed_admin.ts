import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        const username = 'admin';
        const password = 'admin123';
        const passwordHash = await bcrypt.hash(password, 10);

        console.log(`Creating/Updating admin user: ${username}`);

        // Check if user exists
        const existingUser = await db.findOne(Collections.USERS, { username });

        let userId: string;

        if (existingUser) {
            console.log('User exists, updating password...');
            const success = await db.updateOne(Collections.USERS, { username }, {
                $set: {
                    password_hash: passwordHash,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }
            });
            userId = existingUser.id!;
        } else {
            console.log('Creating new admin user...');
            const newUser: any = await db.insertOne(Collections.USERS, {
                username,
                password_hash: passwordHash,
                full_name: 'System Admin',
                role: 'admin',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            userId = newUser.id;
        }

        console.log(`User ID: ${userId}`);

        // Update permissions
        console.log('Updating permissions...');
        const permissions = {
            user_id: userId,
            can_delete_schools: true,
            can_manage_users: true,
            can_assign_training: true,
            can_view_reports: true,
            can_manage_schools: true,
            can_manage_teachers: true,
            can_manage_mentors: true,
            can_manage_admin_personnel: true,
            can_manage_training_programs: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const existingPerms = await db.findOne(Collections.PERMISSIONS, { user_id: userId });

        if (existingPerms) {
            await db.updateOne(Collections.PERMISSIONS, { user_id: userId }, {
                $set: permissions
            });
        } else {
            await db.insertOne(Collections.PERMISSIONS, permissions);
        }

        console.log('Admin user seeded successfully.');
        console.log('Username: admin');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error seeding admin:', error);
    } finally {
        await mongodb.disconnect();
    }
}

seedAdmin();