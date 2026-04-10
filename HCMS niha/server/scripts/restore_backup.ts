import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import { readFileSync } from 'fs';

async function restoreBackup() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Read the backup file
        const backupPath = '../database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        
        console.log('Backup file loaded successfully');
        console.log('Total users in backup:', backupData.data.users.length);
        console.log('Total schools in backup:', backupData.data.schools.length);
        console.log('Total teachers in backup:', backupData.data.teachers.length);
        console.log('Total mentors in backup:', backupData.data.mentors.length);
        console.log('Total training programs in backup:', backupData.data.training_programs.length);
        console.log('Total training attendance in backup:', backupData.data.training_attendance.length);
        console.log('Total training assignments in backup:', backupData.data.training_assignments.length);
        console.log('Total school assignments in backup:', backupData.data.school_assignments.length);
        console.log('Total employee tasks in backup:', backupData.data.employee_tasks.length);
        console.log('Total school followups in backup:', backupData.data.school_followups.length);
        console.log('Total user devices in backup:', backupData.data.user_devices.length);

        // Clear existing data (optional - uncomment if you want to start fresh)
        // console.log('Clearing existing data...');
        // await mongodb.getCollection(Collections.USERS).deleteMany({});
        // await mongodb.getCollection(Collections.PERMISSIONS).deleteMany({});
        // await mongodb.getCollection(Collections.SCHOOLS).deleteMany({});
        // await mongodb.getCollection(Collections.TEACHERS).deleteMany({});
        // await mongodb.getCollection(Collections.MENTORS).deleteMany({});
        // await mongodb.getCollection(Collections.MENTOR_SCHOOLS).deleteMany({});
        // await mongodb.getCollection(Collections.ADMIN_PERSONNEL).deleteMany({});
        // await mongodb.getCollection(Collections.TRAINING_PROGRAMS).deleteMany({});
        // await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).deleteMany({});
        // await mongodb.getCollection(Collections.TRAINING_ATTENDANCE).deleteMany({});
        // await mongodb.getCollection(Collections.SCHOOL_ASSIGNMENTS).deleteMany({});
        // await mongodb.getCollection(Collections.EMPLOYEE_TASKS).deleteMany({});
        // await mongodb.getCollection(Collections.SCHOOL_FOLLOWUPS).deleteMany({});
        // await mongodb.getCollection(Collections.USER_DEVICES).deleteMany({});
        // console.log('Existing data cleared');

        // Restore users
        console.log('Restoring users...');
        let usersInserted = 0;
        const batchSize = 50;
        
        for (let i = 0; i < backupData.data.users.length; i += batchSize) {
            const batch = backupData.data.users.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((user: any) => {
                return {
                    ...user,
                    created_at: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
                    updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : new Date().toISOString()
                };
            });
            
            try {
                await db.insertMany(Collections.USERS, convertedBatch);
                usersInserted += batch.length;
                console.log(`Inserted user batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.users.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting user batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${usersInserted} users`);

        // Restore schools
        console.log('Restoring schools...');
        let schoolsInserted = 0;
        
        for (let i = 0; i < backupData.data.schools.length; i += batchSize) {
            const batch = backupData.data.schools.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((school: any) => {
                return {
                    ...school,
                    created_at: school.created_at ? new Date(school.created_at).toISOString() : new Date().toISOString(),
                    updated_at: school.updated_at ? new Date(school.updated_at).toISOString() : new Date().toISOString()
                };
            });
            
            try {
                await db.insertMany(Collections.SCHOOLS, convertedBatch);
                schoolsInserted += batch.length;
                console.log(`Inserted school batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.schools.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting school batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${schoolsInserted} schools`);

        // Restore teachers
        console.log('Restoring teachers...');
        let teachersInserted = 0;
        
        for (let i = 0; i < backupData.data.teachers.length; i += batchSize) {
            const batch = backupData.data.teachers.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((teacher: any) => {
                return {
                    ...teacher,
                    created_at: teacher.created_at ? new Date(teacher.created_at).toISOString() : new Date().toISOString(),
                    updated_at: teacher.updated_at ? new Date(teacher.updated_at).toISOString() : new Date().toISOString(),
                    hire_date: teacher.hire_date ? new Date(teacher.hire_date).toISOString().split('T')[0] : null
                };
            });
            
            try {
                await db.insertMany(Collections.TEACHERS, convertedBatch);
                teachersInserted += batch.length;
                console.log(`Inserted teacher batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.teachers.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting teacher batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${teachersInserted} teachers`);

        // Restore mentors
        console.log('Restoring mentors...');
        let mentorsInserted = 0;
        
        for (let i = 0; i < backupData.data.mentors.length; i += batchSize) {
            const batch = backupData.data.mentors.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((mentor: any) => {
                return {
                    ...mentor,
                    created_at: mentor.created_at ? new Date(mentor.created_at).toISOString() : new Date().toISOString(),
                    updated_at: mentor.updated_at ? new Date(mentor.updated_at).toISOString() : new Date().toISOString()
                };
            });
            
            try {
                await db.insertMany(Collections.MENTORS, convertedBatch);
                mentorsInserted += batch.length;
                console.log(`Inserted mentor batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.mentors.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting mentor batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${mentorsInserted} mentors`);

        // Restore training programs
        console.log('Restoring training programs...');
        let trainingProgramsInserted = 0;
        
        for (let i = 0; i < backupData.data.training_programs.length; i += batchSize) {
            const batch = backupData.data.training_programs.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((program: any) => {
                return {
                    ...program,
                    created_at: program.created_at ? new Date(program.created_at).toISOString() : new Date().toISOString(),
                    updated_at: program.updated_at ? new Date(program.updated_at).toISOString() : new Date().toISOString(),
                    start_date: program.start_date ? new Date(program.start_date).toISOString().split('T')[0] : null,
                    end_date: program.end_date ? new Date(program.end_date).toISOString().split('T')[0] : null
                };
            });
            
            try {
                await db.insertMany(Collections.TRAINING_PROGRAMS, convertedBatch);
                trainingProgramsInserted += batch.length;
                console.log(`Inserted training program batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.training_programs.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting training program batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${trainingProgramsInserted} training programs`);

        // Restore training attendance
        console.log('Restoring training attendance...');
        let trainingAttendanceInserted = 0;
        
        for (let i = 0; i < backupData.data.training_attendance.length; i += batchSize) {
            const batch = backupData.data.training_attendance.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((attendance: any) => {
                return {
                    ...attendance,
                    created_at: attendance.created_at ? new Date(attendance.created_at).toISOString() : new Date().toISOString(),
                    updated_at: attendance.updated_at ? new Date(attendance.updated_at).toISOString() : new Date().toISOString(),
                    attendance_date: attendance.attendance_date ? new Date(attendance.attendance_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                };
            });
            
            try {
                await db.insertMany(Collections.TRAINING_ATTENDANCE, convertedBatch);
                trainingAttendanceInserted += batch.length;
                console.log(`Inserted training attendance batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.training_attendance.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting training attendance batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${trainingAttendanceInserted} training attendance records`);

        // Restore training assignments
        console.log('Restoring training assignments...');
        let trainingAssignmentsInserted = 0;
        
        for (let i = 0; i < backupData.data.training_assignments.length; i += batchSize) {
            const batch = backupData.data.training_assignments.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((assignment: any) => {
                return {
                    ...assignment,
                    created_at: assignment.created_at ? new Date(assignment.created_at).toISOString() : new Date().toISOString(),
                    updated_at: assignment.updated_at ? new Date(assignment.updated_at).toISOString() : new Date().toISOString(),
                    assigned_date: assignment.assigned_date ? new Date(assignment.assigned_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    due_date: assignment.due_date ? new Date(assignment.due_date).toISOString().split('T')[0] : null,
                    completion_date: assignment.completion_date ? new Date(assignment.completion_date).toISOString().split('T')[0] : null
                };
            });
            
            try {
                await db.insertMany(Collections.TRAINING_ASSIGNMENTS, convertedBatch);
                trainingAssignmentsInserted += batch.length;
                console.log(`Inserted training assignment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.training_assignments.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting training assignment batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${trainingAssignmentsInserted} training assignments`);

        // Restore school assignments
        console.log('Restoring school assignments...');
        let schoolAssignmentsInserted = 0;
        
        for (let i = 0; i < backupData.data.school_assignments.length; i += batchSize) {
            const batch = backupData.data.school_assignments.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((assignment: any) => {
                return {
                    ...assignment,
                    assigned_at: assignment.assigned_at ? new Date(assignment.assigned_at).toISOString() : new Date().toISOString()
                };
            });
            
            try {
                await db.insertMany(Collections.SCHOOL_ASSIGNMENTS, convertedBatch);
                schoolAssignmentsInserted += batch.length;
                console.log(`Inserted school assignment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.school_assignments.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting school assignment batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${schoolAssignmentsInserted} school assignments`);

        // Restore employee tasks
        console.log('Restoring employee tasks...');
        let employeeTasksInserted = 0;
        
        for (let i = 0; i < backupData.data.employee_tasks.length; i += batchSize) {
            const batch = backupData.data.employee_tasks.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((task: any) => {
                return {
                    ...task,
                    created_at: task.created_at ? new Date(task.created_at).toISOString() : new Date().toISOString(),
                    updated_at: task.updated_at ? new Date(task.updated_at).toISOString() : new Date().toISOString(),
                    due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : null,
                    completed_at: task.completed_at ? new Date(task.completed_at).toISOString() : null
                };
            });
            
            try {
                await db.insertMany(Collections.EMPLOYEE_TASKS, convertedBatch);
                employeeTasksInserted += batch.length;
                console.log(`Inserted employee task batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.employee_tasks.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting employee task batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${employeeTasksInserted} employee tasks`);

        // Restore school followups
        console.log('Restoring school followups...');
        let schoolFollowupsInserted = 0;
        
        for (let i = 0; i < backupData.data.school_followups.length; i += batchSize) {
            const batch = backupData.data.school_followups.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((followup: any) => {
                return {
                    ...followup,
                    created_at: followup.created_at ? new Date(followup.created_at).toISOString() : new Date().toISOString(),
                    updated_at: followup.updated_at ? new Date(followup.updated_at).toISOString() : new Date().toISOString(),
                    followup_date: followup.followup_date ? new Date(followup.followup_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    next_followup_date: followup.next_followup_date ? new Date(followup.next_followup_date).toISOString().split('T')[0] : null
                };
            });
            
            try {
                await db.insertMany(Collections.SCHOOL_FOLLOWUPS, convertedBatch);
                schoolFollowupsInserted += batch.length;
                console.log(`Inserted school followup batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.school_followups.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting school followup batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${schoolFollowupsInserted} school followups`);

        // Restore user devices
        console.log('Restoring user devices...');
        let userDevicesInserted = 0;
        
        for (let i = 0; i < backupData.data.user_devices.length; i += batchSize) {
            const batch = backupData.data.user_devices.slice(i, i + batchSize);
            // Convert Supabase-style timestamps to MongoDB format
            const convertedBatch = batch.map((device: any) => {
                return {
                    ...device,
                    created_at: device.created_at ? new Date(device.created_at).toISOString() : new Date().toISOString(),
                    updated_at: device.updated_at ? new Date(device.updated_at).toISOString() : new Date().toISOString(),
                    first_login: device.first_login ? new Date(device.first_login).toISOString() : new Date().toISOString(),
                    last_login: device.last_login ? new Date(device.last_login).toISOString() : new Date().toISOString()
                };
            });
            
            try {
                await db.insertMany(Collections.USER_DEVICES, convertedBatch);
                userDevicesInserted += batch.length;
                console.log(`Inserted user device batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.user_devices.length/batchSize)}`);
            } catch (error) {
                console.error(`Error inserting user device batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
        }
        console.log(`Restored ${userDevicesInserted} user devices`);

        // Restore permissions (if available and valid)
        if (backupData.data.permissions && !backupData.data.permissions.error) {
            console.log('Restoring permissions...');
            let permissionsInserted = 0;
            
            for (let i = 0; i < backupData.data.permissions.data.length; i += batchSize) {
                const batch = backupData.data.permissions.data.slice(i, i + batchSize);
                // Convert Supabase-style timestamps to MongoDB format
                const convertedBatch = batch.map((permission: any) => {
                    return {
                        ...permission,
                        created_at: permission.created_at ? new Date(permission.created_at).toISOString() : new Date().toISOString(),
                        updated_at: permission.updated_at ? new Date(permission.updated_at).toISOString() : new Date().toISOString()
                    };
                });
                
                try {
                    await db.insertMany(Collections.PERMISSIONS, convertedBatch);
                    permissionsInserted += batch.length;
                    console.log(`Inserted permission batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.data.permissions.data.length/batchSize)}`);
                } catch (error) {
                    console.error(`Error inserting permission batch ${Math.floor(i/batchSize) + 1}:`, error);
                }
            }
            console.log(`Restored ${permissionsInserted} permissions`);
        } else {
            console.log('Skipping permissions restoration due to error in backup file');
        }

        console.log('=== Backup restoration complete ===');
        console.log(`Total users restored: ${usersInserted}`);
        console.log(`Total schools restored: ${schoolsInserted}`);
        console.log(`Total teachers restored: ${teachersInserted}`);
        console.log(`Total mentors restored: ${mentorsInserted}`);
        console.log(`Total training programs restored: ${trainingProgramsInserted}`);
        console.log(`Total training attendance records restored: ${trainingAttendanceInserted}`);
        console.log(`Total training assignments restored: ${trainingAssignmentsInserted}`);
        console.log(`Total school assignments restored: ${schoolAssignmentsInserted}`);
        console.log(`Total employee tasks restored: ${employeeTasksInserted}`);
        console.log(`Total school followups restored: ${schoolFollowupsInserted}`);
        console.log(`Total user devices restored: ${userDevicesInserted}`);

    } catch (error) {
        console.error('Error restoring backup:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

restoreBackup();