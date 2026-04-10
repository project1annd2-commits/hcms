import 'dotenv/config';
import express, { Request, Response } from 'express';
import { mongodb } from '../server/src/config/mongodb';
import { db } from '../server/src/services/db';
import { Collections } from '../server/src/config/mongodb';
import bcrypt from 'bcryptjs';
import serverless from 'serverless-http';

const app = express();

app.get('/api/seed-admin', async (req: Request, res: Response) => {
    try {
        await mongodb.connect();

        const username = 'admin';
        const password = 'admin123';
        const passwordHash = await bcrypt.hash(password, 10);

        // Check if user exists
        const existingUser = await db.findOne(Collections.USERS, { username });

        let userId: string;

        if (existingUser) {
            const success = await db.updateOne(Collections.USERS, { username }, {
                $set: {
                    password_hash: passwordHash,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }
            });
            userId = existingUser.id!;
        } else {
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

        // Update permissions
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

        res.json({
            success: true,
            message: 'Admin user seeded successfully',
            credentials: {
                username: 'admin',
                password: 'admin123'
            }
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default serverless(app);
