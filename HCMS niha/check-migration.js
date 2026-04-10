const { MongoClient } = require('mongodb');
const fs = require('fs');

const uri = 'mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true';
const dbName = 'hcms_db';

async function checkMigrationStatus() {
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        autoSelectFamily: false,
        tls: true,
        tlsAllowInvalidCertificates: true,
    });

    try {
        await client.connect();
        console.log('✓ Connected to MongoDB\n');

        const db = client.db(dbName);

        // Read backup file to compare counts
        const backupPath = './database-backup-2025-11-24 (1).json';
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        console.log('=== DATABASE MIGRATION STATUS ===\n');
        console.log('Backup Date:', backupData.backup_date);
        console.log('\n' + '='.repeat(70));
        console.log('Collection'.padEnd(30) + 'Backup'.padStart(10) + 'MongoDB'.padStart(15) + 'Status'.padStart(15));
        console.log('='.repeat(70));

        const collections = [
            { name: 'users', label: 'Users' },
            { name: 'schools', label: 'Schools' },
            { name: 'teachers', label: 'Teachers' },
            { name: 'mentors', label: 'Mentors' },
            { name: 'training_programs', label: 'Training Programs' },
            { name: 'training_attendance', label: 'Training Attendance' },
            { name: 'training_assignments', label: 'Training Assignments' },
            { name: 'school_assignments', label: 'School Assignments' },
            { name: 'employee_tasks', label: 'Employee Tasks' },
            { name: 'school_followups', label: 'School Followups' },
            { name: 'user_devices', label: 'User Devices' },
        ];

        let allMigrated = true;
        let totalBackup = 0;
        let totalMongo = 0;

        for (const { name, label } of collections) {
            const backupCount = Array.isArray(backupData.data[name])
                ? backupData.data[name].length
                : 0;
            const mongoCount = await db.collection(name).countDocuments();

            const status = mongoCount >= backupCount ? '✓ Complete' : '⚠ Incomplete';
            if (mongoCount < backupCount) allMigrated = false;

            console.log(
                label.padEnd(30) +
                backupCount.toString().padStart(10) +
                mongoCount.toString().padStart(15) +
                status.padStart(15)
            );

            totalBackup += backupCount;
            totalMongo += mongoCount;
        }

        console.log('='.repeat(70));
        console.log(
            'TOTAL'.padEnd(30) +
            totalBackup.toString().padStart(10) +
            totalMongo.toString().padStart(15)
        );
        console.log('='.repeat(70));

        console.log('\n');
        if (totalMongo === 0) {
            console.log('⚠ WARNING: No data found in MongoDB!');
            console.log('⚠ Migration has NOT been completed yet.');
            console.log('\nTo migrate data, run:');
            console.log('  cd server');
            console.log('  npx ts-node scripts/restore_backup.ts');
        } else if (allMigrated && totalMongo >= totalBackup) {
            console.log('✓ SUCCESS: Migration is COMPLETE!');
            console.log(`✓ All ${totalMongo} records have been migrated from Supabase to MongoDB`);
        } else {
            console.log('⚠ WARNING: Migration appears INCOMPLETE');
            console.log(`  Backup contains: ${totalBackup} records`);
            console.log(`  MongoDB contains: ${totalMongo} records`);
        }
        console.log('\n');

    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

checkMigrationStatus();
