
import { db } from '../src/services/db';
import { Collections, mongodb } from '../src/config/mongodb';

async function main() {
    try {
        await mongodb.connect();
        console.log("Searching for user 'Farheen'...");
        const users = await db.find(Collections.USERS, {});
        const farheen = users.find((u: any) =>
            (u.full_name && u.full_name.toLowerCase().includes('farheen')) ||
            (u.username && u.username.toLowerCase().includes('farheen'))
        );

        if (farheen) {
            console.log("Found User:");
            console.log(JSON.stringify(farheen, null, 2));
        } else {
            console.log("User 'Farheen' not found.");
        }

        console.log("\nSearching for Training Program 'C10'...");
        const programs = await db.find(Collections.TRAINING_PROGRAMS, {});
        const c10 = programs.filter((p: any) =>
            (p.title && p.title.toLowerCase().includes('c10')) ||
            (p.title && p.title.toLowerCase().includes('c.10'))
        );

        if (c10.length > 0) {
            console.log("Found C10 Programs:");
            console.log(JSON.stringify(c10, null, 2));
        } else {
            console.log("Training Program 'C10' not found.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

main();
