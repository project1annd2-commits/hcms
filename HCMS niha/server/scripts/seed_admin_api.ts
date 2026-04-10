
import bcrypt from 'bcryptjs';

const API_URL = 'http://localhost:5000/api';

async function seedAdmin() {
    try {
        console.log('Checking for existing admin user...');
        const filter = JSON.stringify({ username: 'admin' });
        const response = await fetch(`${API_URL}/users?filter=${encodeURIComponent(filter)}`);
        const users = await response.json();

        let userId;

        const passwordHash = await bcrypt.hash('admin123', 10);

        if (Array.isArray(users) && users.length > 0) {
            console.log('Admin user exists, updating password...');
            const user = users[0];
            userId = user._id || user.id;

            await fetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password_hash: passwordHash,
                    is_active: true,
                    updated_at: new Date().toISOString()
                })
            });
        } else {
            console.log('Creating new admin user...');
            const createResponse = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password_hash: passwordHash,
                    full_name: 'System Admin',
                    role: 'admin',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });
            const newUser = await createResponse.json();
            console.log('Create response:', newUser);
            userId = newUser.id || newUser._id;
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
            can_manage_training_programs: true
        };

        const permFilter = JSON.stringify({ user_id: userId });
        const permResponse = await fetch(`${API_URL}/permissions?filter=${encodeURIComponent(permFilter)}`);
        const perms = await permResponse.json();

        if (Array.isArray(perms) && perms.length > 0) {
            const perm = perms[0];
            const permId = perm._id || perm.id;
            await fetch(`${API_URL}/permissions/${permId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(permissions)
            });
        } else {
            await fetch(`${API_URL}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(permissions)
            });
        }

        console.log('Admin user seeded successfully via API.');
        console.log('Username: admin');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error seeding admin:', error);
    }
}

seedAdmin();
