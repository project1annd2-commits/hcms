import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- checking specific school IDs ---');

    const id1 = 'ce1e4f4e-5ecb-499b-8107-16016a578f7e'; // Assignment ID for Parveen?
    const id2 = '5fe96229-4841-4867-bec1-b3ece08e72fa'; // Followup ID?

    const s1 = await db.findOne<any>(Collections.SCHOOLS, { id: id1 });
    const s2 = await db.findOne<any>(Collections.SCHOOLS, { id: id2 });

    console.log('School 1:', s1 ? `${s1.name} (${s1.id}) Code: ${s1.code}` : 'NOT FOUND');
    console.log('School 2:', s2 ? `${s2.name} (${s2.id}) Code: ${s2.code}` : 'NOT FOUND');

    // Check if ID1 is used anywhere in SCHOOLS (maybe as a different field?)
    const all = await db.find<any>(Collections.SCHOOLS, {});
    const match = all.find(s => s.id === id1 || s.code === id1);
    if (match) console.log(`Found match for ID1 in schools! Name: ${match.name}`);
}

debug().catch(console.error);
