import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import { mongodb } from '../src/config/mongodb';
import bcrypt from 'bcryptjs';
import { School, User } from '../src/models';

async function main() {
    await mongodb.connect();
    console.log('Creating test employee...');

    // 1. Find CMA School (where Maaz is)
    const schools = await db.find<School>(Collections.SCHOOLS, {});
    const cma = schools.find(s => s.name && s.name.includes('CMA'));

    if (!cma) {
        console.error('CMA School not found. Cannot assign test employee.');
        return;
    }
    console.log('Found School:', cma.name, cma.id);

    // 2. Create/Update Employee
    const username = 'rahmantest';
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await db.findOne<User>(Collections.USERS, { username });
    let userId;

    if (existing) {
        userId = existing.id;
        await db.updateById(Collections.USERS, existing.id!, {
            password_hash: passwordHash,
            role: 'employee',
            is_active: true
        });
        console.log('Updated existing user:', username);
    } else {
        const newUser = await db.insertOne(Collections.USERS, {
            username,
            full_name: 'Rahman Test (Employee)',
            role: 'employee',
            password_hash: passwordHash,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as any);
        userId = newUser.id;
        console.log('Created new user:', username);
    }

    // 3. Assign to School
    // First clear existing assignments just in case
    await db.deleteMany(Collections.SCHOOL_ASSIGNMENTS, { employee_id: userId });

    await db.insertOne(Collections.SCHOOL_ASSIGNMENTS, {
        employee_id: userId,
        school_id: cma.id,
        assigned_at: new Date().toISOString()
    });
    console.log('Assigned to school');

    // 4. Give Permissions
    const permissions = {
        user_id: userId,
        can_manage_mentors: true,
        can_manage_teachers: true,
        can_view_reports: true,
        can_manage_schools: false, // Employees usually differ here
        updated_at: new Date().toISOString()
    };

    const existingPerms = await db.findOne(Collections.PERMISSIONS, { user_id: userId });
    if (existingPerms) {
        await db.updateOne(Collections.PERMISSIONS, { user_id: userId }, { $set: permissions });
    } else {
        await db.insertOne(Collections.PERMISSIONS, permissions);
    }
    console.log('Permissions updated. Done.');
}

main().catch(console.error);
