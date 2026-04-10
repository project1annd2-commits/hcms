import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

// The fallback URI from mongodb.ts
const uri = "mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true";
const client = new MongoClient(uri, {
    tls: true,
    tlsAllowInvalidCertificates: true,
});

async function run() {
    try {
        console.log("Connecting to Fallback DB (IP)...");
        await client.connect();
        const db = client.db("hcms_db");
        console.log("Connected.");

        const adminUser = await db.collection("users").findOne({ username: "admin" });

        if (adminUser) {
            console.log("✅ Admin user found in Fallback DB.");
            console.log("   ID:", adminUser.id || adminUser._id);

            const password = "admin123";
            const isValid = await bcrypt.compare(password, adminUser.password_hash);

            if (isValid) {
                console.log("✅ Password 'admin123' is CORRECT in Fallback DB.");
            } else {
                console.log("❌ Password 'admin123' is INCORRECT in Fallback DB.");
            }
        } else {
            console.log("❌ Admin user NOT found in Fallback DB.");
        }

    } catch (error) {
        console.error("Error connecting to Fallback DB:", error);
    } finally {
        await client.close();
    }
}

run().catch(console.error);
