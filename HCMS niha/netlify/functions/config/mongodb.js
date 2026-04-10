"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collections = exports.mongodb = void 0;
exports.ensureConnected = ensureConnected;
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI || 'mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true';
const dbName = process.env.MONGODB_DB_NAME || 'hcms_db';
if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
}
class MongoDB {
    static instance;
    client;
    db = null;
    connecting = null;
    constructor() {
        this.client = new mongodb_1.MongoClient(uri, {
            // Increase timeouts for serverless cold starts
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            tls: false,
            tlsAllowInvalidCertificates: true,
            autoSelectFamily: false,
        });
    }
    static getInstance() {
        if (!MongoDB.instance) {
            MongoDB.instance = new MongoDB();
        }
        return MongoDB.instance;
    }
    async connect() {
        if (this.db) {
            return; // Already connected
        }
        if (this.connecting) {
            return this.connecting; // Connection in progress
        }
        this.connecting = (async () => {
            try {
                await this.client.connect();
                this.db = this.client.db(dbName);
                console.log('MongoDB connected successfully to database:', dbName);
            }
            catch (error) {
                // Log full error details for Vercel logs
                console.error('❗️ MongoDB connection failed. Details:', error);
                // Re‑throw so the serverless function returns a 500
                throw error;
            }
            finally {
                this.connecting = null;
            }
        })();
        return this.connecting;
    }
    getDb() {
        if (!this.db) {
            throw new Error('Database not initialized. Call connect() first.');
        }
        return this.db;
    }
    getCollection(name) {
        return this.getDb().collection(name);
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.db = null;
            console.log('MongoDB disconnected');
        }
    }
}
// Singleton instance
exports.mongodb = MongoDB.getInstance();
// Collection names as constants
exports.Collections = {
    USERS: 'users',
    PERMISSIONS: 'permissions',
    SCHOOLS: 'schools',
    TEACHERS: 'teachers',
    MENTORS: 'mentors',
    MENTOR_SCHOOLS: 'mentor_schools',
    ADMIN_PERSONNEL: 'admin_personnel',
    TRAINING_PROGRAMS: 'training_programs',
    TRAINING_ASSIGNMENTS: 'training_assignments',
    TRAINING_ATTENDANCE: 'training_attendance',
    EMPLOYEE_TASKS: 'employee_tasks',
    SCHOOL_FOLLOWUPS: 'school_followups',
    SCHOOL_ASSIGNMENTS: 'school_assignments',
    USER_DEVICES: 'user_devices',
};
// Helper function to ensure connection before operations
async function ensureConnected() {
    await exports.mongodb.connect();
    return exports.mongodb.getDb();
}
