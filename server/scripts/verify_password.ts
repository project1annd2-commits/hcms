import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = "mongodb+srv://curriculumhauna_db_user:KISSwGBN1KlSrV71@cluster0.pj5vnq8.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await client.connect();
        const db = client.db("hcms_db");
        console.log("Connected.");

        const adminUser = await db.collection("users").findOne({ username: "admin" });

        if (adminUser) {
            console.log("✅ Admin user found.");

            const password = "admin123";
            const isValid = await bcrypt.compare(password, adminUser.password_hash);

            if (isValid) {
                console.log("✅ Password 'admin123' is CORRECT.");
            } else {
                console.log("❌ Password 'admin123' is INCORRECT.");
                console.log("   Hash found:", adminUser.password_hash);
            }
        } else {
            console.log("❌ Admin user NOT found.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

run().catch(console.error);
