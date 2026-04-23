import { MongoClient, Db, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'hcms_db';

if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    throw new Error('MONGODB_URI environment variable is not set');
}

class MongoDB {
    private static instance: MongoDB;
    private client: MongoClient;
    private db: Db | null = null;
    private connecting: Promise<void> | null = null;

    private constructor() {
        this.client = new MongoClient(uri!, {
            // Increase timeouts for serverless cold starts
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            // MongoDB Atlas requires TLS - do not disable
            autoSelectFamily: false,
        });
    }

    public static getInstance(): MongoDB {
        if (!MongoDB.instance) {
            MongoDB.instance = new MongoDB();
        }
        return MongoDB.instance;
    }

    public async connect(): Promise<void> {
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
            } catch (error) {
                // Log full error details for Vercel logs
                console.error('❗️ MongoDB connection failed. Details:', error);
                // Re‑throw so the serverless function returns a 500
                throw error;
            } finally {
                this.connecting = null;
            }
        })();

        return this.connecting;
    }

    public getDb(): Db {
        if (!this.db) {
            throw new Error('Database not initialized. Call connect() first.');
        }
        return this.db;
    }

    public getCollection<T extends import('mongodb').Document>(name: string): Collection<T> {
        return this.getDb().collection<T>(name);
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.db = null;
            console.log('MongoDB disconnected');
        }
    }
}

// Singleton instance
export const mongodb = MongoDB.getInstance();

// Collection names as constants
export const Collections = {
    USERS: 'users',
    PERMISSIONS: 'permissions',
    SCHOOLS: 'schools',
    TEACHERS: 'teachers',
    MENTORS: 'mentors',
    MENTOR_SCHOOLS: 'mentor_schools',
    ADMIN_PERSONNEL: 'admin_personnel',
    TRAINING_PROGRAMS: 'training_programs',
    TRAINING_ASSIGNMENTS: 'training_assignments',
    MENTOR_TRAINING_ASSIGNMENTS: 'mentor_training_assignments',
    TRAINING_ATTENDANCE: 'training_attendance',
    MENTOR_TRAINING_ATTENDANCE: 'mentor_training_attendance',
    EMPLOYEE_TASKS: 'employee_tasks',
    SCHOOL_FOLLOWUPS: 'school_followups',
    SCHOOL_ASSIGNMENTS: 'school_assignments',
    USER_DEVICES: 'user_devices',
    MANAGEMENT: 'management',
    STUDENTS: 'students',
    STUDENT_ASSESSMENTS: 'student_assessments',
} as const;

// Helper function to ensure connection before operations
export async function ensureConnected(): Promise<Db> {
    await mongodb.connect();
    return mongodb.getDb();
}
