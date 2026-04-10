import { MongoClient } from "mongodb";

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
            console.log("✅ Admin user found:");
            console.log("  ID:", adminUser.id || adminUser._id);
            console.log("  Username:", adminUser.username);
            console.log("  Role:", adminUser.role);
            console.log("  Is Active:", adminUser.is_active);
            console.log("  Password Hash exists:", !!adminUser.password_hash);
        } else {
            console.log("❌ Admin user NOT found in 'users' collection.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

run().catch(console.error);
