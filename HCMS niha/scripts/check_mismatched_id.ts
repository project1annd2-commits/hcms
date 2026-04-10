import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    const id = 'ce1e4f4e-5ecb-499b-8107-16016a578f7e';
    const school = await db.findOne<any>(Collections.SCHOOLS, { id });
    console.log('School for ID ce1e...:', school ? `${school.name} (Code: ${school.code})` : 'NOT FOUND');

    const allSchools = await db.find<any>(Collections.SCHOOLS, {});
    const byCode = allSchools.find(s => s.code === 'UP049'); // Code for Zenith Global
    console.log('Zenith Global (UP049):', byCode ? `${byCode.name} (ID: ${byCode.id})` : 'NOT FOUND');
}

debug().catch(console.error);
