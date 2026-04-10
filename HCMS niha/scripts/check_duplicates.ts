import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- checking for duplicate school names ---');

    const allSchools = await db.find<any>(Collections.SCHOOLS, {});
    const nameMap = new Map<string, any[]>();

    allSchools.forEach(s => {
        const name = s.name?.toLowerCase().trim();
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name)!.push(s);
    });

    for (const [name, schools] of nameMap.entries()) {
        if (schools.length > 1) {
            console.log(`\nDuplicate name: "${name}"`);
            schools.forEach(s => {
                console.log(`  ID: ${s.id}, Code: ${s.code}, City: ${s.city}`);
            });
        }
    }
}

debug().catch(console.error);
