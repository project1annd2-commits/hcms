import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

/**
 * Migration script to approve all existing devices
 * This ensures that existing devices continue to work after implementing the approval workflow
 */

async function migrateExistingDevices() {
    console.log('Starting device migration...');

    try {
        // Get all existing devices
        const devices = await db.find(Collections.USER_DEVICES, {});
        console.log(`Found ${devices.length} devices to migrate`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const device of devices) {
            try {
                // Check if device already has is_approved field
                if (device.is_approved === undefined || device.is_approved === null) {
                    await db.updateById(Collections.USER_DEVICES, device.id!, {
                        is_approved: true,
                        updated_at: new Date().toISOString()
                    });
                    updatedCount++;
                    console.log(`✓ Approved device ${device.id} for user ${device.user_id}`);
                } else {
                    console.log(`- Device ${device.id} already has approval status: ${device.is_approved}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`✗ Error updating device ${device.id}:`, error);
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`Total devices: ${devices.length}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Skipped (already migrated): ${devices.length - updatedCount - errorCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateExistingDevices()
    .then(() => {
        console.log('\nMigration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nMigration failed:', error);
        process.exit(1);
    });
