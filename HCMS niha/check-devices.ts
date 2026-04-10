
import { db } from './src/lib/services/db';
import { Collections } from './src/lib/constants';

async function checkDevices() {
    try {
        const devices = await db.find(Collections.USER_DEVICES, {});
        console.log(`User Devices Count: ${devices.length}`);
        if (devices.length > 0) {
            console.log('First device:', JSON.stringify(devices[0], null, 2));
        }

        const users = await db.find(Collections.USERS, {});
        console.log(`Users Count: ${users.length}`);

    } catch (error) {
        console.error('Error checking devices:', error);
    }
}

checkDevices();
