import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { mongodb } from './config/mongodb';
import { db } from './services/db';
import { Collections } from './config/mongodb';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Async wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Connect to MongoDB on-demand in route handlers, not on module load
// This prevents crashes in serverless cold starts

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'HCMS API Server is running' });
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            hasMongoUri: !!process.env.MONGODB_URI,
            hasMongoDbName: !!process.env.MONGODB_DB_NAME
        }
    });
});

// Login for admin or teacher (role = 'admin' | 'teacher')
app.post('/api/auth/login', asyncHandler(async (req: Request, res: Response) => {
    const { username, password, role } = req.body;

    // Connect to MongoDB on-demand
    await mongodb.connect();

    // Choose collection based on role
    const collection = role === 'teacher' ? Collections.TEACHERS : Collections.USERS;

    const user = await db.findOne(collection, { username, is_active: true });

    if (!user) {
        return res.status(401).json({
            error: 'Invalid username or password'
        });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        return res.status(401).json({
            error: 'Invalid username or password'
        });
    }

    // Admins get permissions, teachers do not
    const permissions = role === 'teacher' ? null : await db.findOne(Collections.PERMISSIONS, { user_id: user.id });
    res.json({ user, permissions });
}));

// Teacher login via phone (existing route, keep unchanged)
app.post('/api/auth/teacher-login', asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;

    const teacher = await db.findOne(Collections.TEACHERS, {
        phone,
        is_active_login: true,
        status: 'active',
    });

    if (!teacher) {
        return res.status(401).json({ error: 'Invalid phone number or inactive account' });
    }

    res.json({ teacher });
}));

// Seed admin user endpoint
app.get('/api/seed-admin', asyncHandler(async (req: Request, res: Response) => {
    const username = 'admin';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    const existingUser = await db.findOne(Collections.USERS, { username });
    let userId: string;

    if (existingUser) {
        await db.updateOne(Collections.USERS, { username }, {
            $set: {
                password_hash: passwordHash,
                is_active: true,
                updated_at: new Date().toISOString()
            }
        });
        userId = existingUser.id!;
    } else {
        const newUser: any = await db.insertOne(Collections.USERS, {
            username,
            password_hash: passwordHash,
            full_name: 'System Admin',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        userId = newUser.id;
    }

    const permissions = {
        user_id: userId,
        can_delete_schools: true,
        can_manage_users: true,
        can_assign_training: true,
        can_view_reports: true,
        can_manage_schools: true,
        can_manage_teachers: true,
        can_manage_mentors: true,
        can_manage_admin_personnel: true,
        can_manage_training_programs: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const existingPerms = await db.findOne(Collections.PERMISSIONS, { user_id: userId });
    if (existingPerms) {
        await db.updateOne(Collections.PERMISSIONS, { user_id: userId }, { $set: permissions });
    } else {
        await db.insertOne(Collections.PERMISSIONS, permissions);
    }

    res.json({
        success: true,
        message: 'Admin user created/updated',
        credentials: { username: 'admin', password: 'admin123' }
    });
});

/* ==================== TRAINING JOIN ==================== */

app.post(
    '/api/training/join',
    asyncHandler(async (req: Request, res: Response) => {
        const { teacherId, assignmentId } = req.body;

        // Verify teacher exists and is active
        const teacher = await db.findOne(Collections.TEACHERS, { id: teacherId, status: 'active' });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        // Verify assignment exists and belongs to this teacher
        const assignment = await db.findOne(Collections.TRAINING_ASSIGNMENTS, {
            id: assignmentId,
            teacher_id: teacherId,
        });
        if (!assignment) return res.status(404).json({ error: 'Assignment not found or not assigned to this teacher' });

        // Insert attendance if not already present
        const existing = await db.findOne(Collections.TRAINING_ATTENDANCE, {
            teacher_id: teacherId,
            assignment_id: assignmentId,
        });
        if (existing) return res.status(200).json({ message: 'Already joined', attendance: existing });

        const attendance = await db.insertOne(Collections.TRAINING_ATTENDANCE, {
            teacher_id: teacherId,
            assignment_id: assignmentId,
            status: 'in_progress',
            joined_at: new Date().toISOString(),
        });

        res.status(201).json({ message: 'Joined training', attendance });
    })
);

/* ==================== GENERIC CRUD ==================== */

// Count documents
app.get(
    '/api/:collection/count',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection } = req.params;
        const { filter } = req.query;

        let filterObj = {};
        try {
            filterObj = filter ? JSON.parse(filter as string) : {};
        } catch {
            filterObj = {};
        }

        const count = await db.count(collection, filterObj);
        res.json({ count });
    })
);

// Get all documents
app.get(
    '/api/:collection',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection } = req.params;
        const { filter, sort, limit, skip } = req.query;

        let filterObj = {};
        let sortObj: Record<string, 1 | -1> | undefined;
        let limitNum: number | undefined;
        let skipNum: number | undefined;

        try {
            if (filter) {
                filterObj = JSON.parse(filter as string);
            }
            if (sort) {
                sortObj = JSON.parse(sort as string);
            }
            if (limit) {
                limitNum = parseInt(limit as string);
            }
            if (skip) {
                skipNum = parseInt(skip as string);
            }
        } catch (e) {
            console.error('Error parsing query params:', e);
            return res.status(400).json({ error: 'Invalid query parameters' });
        }

        const results = await db.find(collection, filterObj, {
            sort: sortObj,
            limit: limitNum,
            skip: skipNum,
        });
        res.json(results);
    })
);

// Get single document by id
app.get(
    '/api/:collection/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection, id } = req.params;
        const result = await db.findById(collection, id);
        if (!result) return res.status(404).json({ error: 'Document not found' });
        res.json(result);
    })
);

// Create document
app.post(
    '/api/:collection',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection } = req.params;
        const document = req.body;
        const result = await db.insertOne(collection, document);
        res.status(201).json(result);
    })
);

// Bulk create
app.post(
    '/api/:collection/bulk',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection } = req.params;
        const documents = req.body;
        const results = await db.insertMany(collection, documents);
        res.status(201).json(results);
    })
);

// Update by id
app.put(
    '/api/:collection/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection, id } = req.params;
        const updates = req.body;
        const success = await db.updateById(collection, id, updates);
        if (!success) return res.status(404).json({ error: 'Document not found or not updated' });
        res.json({ success: true, id });
    })
);

// Delete by id
app.delete(
    '/api/:collection/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection, id } = req.params;
        const success = await db.deleteById(collection, id);
        if (!success) return res.status(404).json({ error: 'Document not found' });
        res.json({ success: true, id });
    })
);

// Upsert
app.post(
    '/api/:collection/upsert',
    asyncHandler(async (req: Request, res: Response) => {
        const { collection } = req.params;
        const { filter, document } = req.body;
        const result = await db.upsert(collection, filter, document);
        res.json(result);
    })
);

/* ==================== DASHBOARD STATS ==================== */

app.get(
    '/api/dashboard/stats',
    asyncHandler(async (req: Request, res: Response) => {
        const { role, assignedSchools } = req.query;

        let schoolFilter = {};
        let teacherFilter = {};

        if (role !== 'admin' && assignedSchools) {
            const schoolIds = JSON.parse(assignedSchools as string);
            schoolFilter = { id: { $in: schoolIds } };
            teacherFilter = { school_id: { $in: schoolIds } };
        }

        const [schools, teachers, mentors, programs, assignments] = await Promise.all([
            db.count(Collections.SCHOOLS, schoolFilter),
            db.count(Collections.TEACHERS, teacherFilter),
            db.count(Collections.MENTOR_SCHOOLS, {}),
            db.count(Collections.TRAINING_PROGRAMS, { status: 'active' }),
            db.find(Collections.TRAINING_ASSIGNMENTS, {}),
        ]);

        res.json({ schools, teachers, mentors, programs, assignments });
    })
);

/* ==================== ERROR HANDLING ==================== */

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

/* ==================== SERVER START ==================== */
// For Vercel serverless, we only export the app
// Local development: run this file directly with tsx/ts-node

export default app;
