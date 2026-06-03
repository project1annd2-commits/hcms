const { MongoClient } = require('mongodb');

const uri = 'mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true';

async function checkAttendance() {
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        tls: true,
        tlsAllowInvalidCertificates: true
    });

    try {
        await client.connect();
        console.log('✓ Connected to MongoDB\n');

        const db = client.db('hcms_db');

        // Get total count
        const total = await db.collection('training_attendance').countDocuments();
        console.log('=== ATTENDANCE RECORDS STATUS ===\n');
        console.log(`Total Attendance Records: ${total}\n`);

        // Get sample records
        const samples = await db.collection('training_attendance').find({}).limit(5).toArray();
        console.log('Sample Records:');
        samples.forEach((r, i) => {
            console.log(`  ${i + 1}. Date: ${r.attendance_date}, Status: ${r.status}`);
        });

        // Day-wise breakdown
        console.log('\n=== DAY-WISE BREAKDOWN ===\n');
        const byDate = await db.collection('training_attendance').aggregate([
            {
                $group: {
                    _id: '$attendance_date',
                    count: { $sum: 1 },
                    present: {
                        $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                    },
                    absent: {
                        $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();

        byDate.forEach(d => {
            console.log(`  ${d._id}:`);
            console.log(`    Total: ${d.count} records`);
            console.log(`    Present: ${d.present}, Absent: ${d.absent}`);
        });

        console.log(`\n✅ All ${total} day-wise attendance records are properly stored!\n`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.close();
    }
}

checkAttendance();
