import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { mongodb } from './config/mongodb';
import { db } from './services/db';
import { Collections } from './config/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { firebaseAdmin } from './services/firebase-admin';
import { authenticateToken, authorizeRoles } from './middleware/auth';
import { JWT_SECRET } from './config/auth';

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

// Health check endpoint
app.get('/api/health', asyncHandler(async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            hasMongoUri: !!process.env.MONGODB_URI,
            hasMongoDbName: !!process.env.MONGODB_DB_NAME,
            isProduction: process.env.NODE_ENV === 'production',
            jwtSecretSource: process.env.JWT_SECRET ? 'env' : 'fallback'
        }
    });
}));

// Admin/Employee login
app.post('/api/auth/login', asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = await db.findOne(Collections.USERS, { username });
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.is_active) {
        return res.status(403).json({ error: 'Account is inactive' });
    }

    // Only support hashed passwords
    const isCorrect = user.password_hash && await bcrypt.compare(password, user.password_hash);
    
    if (!isCorrect) {
        // Log attempt?
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    const perms = await db.findOne(Collections.PERMISSIONS, { user_id: user.id });
    
    const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role, permissions: perms },
        JWT_SECRET,
        { expiresIn: '10h' }
    );

    // Strip sensitive fields
    const { password_hash, plain_passcode, passcode, ...safeUser } = user as any;

    res.json({ user: safeUser, permissions: perms, token });
}));

// Participant login verification (Teacher, Mentor, Management) - Step 1: Verify Phone
app.post('/api/auth/verify-phone', asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;
    const firestore = firebaseAdmin.firestore();
    const normalizedInput = phone.replace(/\s+/g, '');

    const findInCollection = async (collectionName: string) => {
        const snapshot = await firestore.collection(collectionName).get();
        return snapshot.docs.find(doc => {
            const data = doc.data();
            const docPhone = (data.phone || '').replace(/\s+/g, '');
            return docPhone === normalizedInput;
        });
    };

    let userDoc = await findInCollection('mentors');
    let type = 'mentor';

    if (!userDoc) {
        userDoc = await findInCollection('teachers');
        type = 'teacher';
    }

    if (!userDoc) {
        userDoc = await findInCollection('management');
        type = 'management';
    }

    if (!userDoc) {
        return res.status(404).json({ error: 'Phone number not found' });
    }

    const userData = userDoc.data() as any;
    const hasPassword = !!(userData.password_hash);

    res.json({ 
        type, 
        userId: userDoc.id, 
        hasPassword,
        name: userData.full_name || userData.name
    });
}));

// Participant login verification - Step 2: Verify Password & Get Token
app.post('/api/auth/participant-login', asyncHandler(async (req: Request, res: Response) => {
    const { userId, type, password } = req.body;
    const firestore = firebaseAdmin.firestore();
    const collectionMap: Record<string, string> = {
        teacher: 'teachers',
        mentor: 'mentors',
        management: 'management'
    };
    const collectionName = collectionMap[type];

    if (!collectionName) {
        return res.status(400).json({ error: 'Invalid user type' });
    }

    const doc = await firestore.collection(collectionName).doc(userId).get();
    if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data() as any;
    const isCorrect = userData.password_hash && await bcrypt.compare(password, userData.password_hash);

    if (!isCorrect) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = jwt.sign(
        { userId, username: userData.username || userData.phone, role: type },
        JWT_SECRET,
        { expiresIn: '10h' }
    );

    const customToken = await firebaseAdmin.auth().createCustomToken(userId, { role: type });
    res.json({ success: true, token, customToken });
}));

// Management login (verify phone only)
app.post('/api/auth/management-login', asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const management = await db.findOne(Collections.MANAGEMENT, { phone });
    if (!management) {
        return res.status(404).json({ error: 'Management account not found' });
    }

    if (management.status !== 'active') {
        return res.status(403).json({ error: 'Account is inactive' });
    }

    const token = jwt.sign(
        { userId: management.id, username: management.phone, role: 'management' },
        JWT_SECRET,
        { expiresIn: '10h' }
    );

    res.json({ user: management, token });
}));

// Firebase custom token endpoint - for frontend to silently sign into Firebase Auth
app.post('/api/auth/firebase-token', asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = req.body;
    
    console.log(`[firebase-token] Received request for userId: ${userId}, role: ${role}`);

    if (!userId || !role) {
        return res.status(400).json({ error: 'userId and role are required' });
    }

    // Verify user exists via Firebase Admin Firestore
    const firestore = firebaseAdmin.firestore();
    const collectionMap: Record<string, string> = {
        teacher: 'teachers',
        mentor: 'mentors',
        management: 'management',
        admin: 'users',
        employee: 'users',
    };
    const collectionName = collectionMap[role] || 'users';

    try {
        // Query Firestore by Document ID
        const docRef = await firestore.collection(collectionName).doc(userId).get();

        if (!docRef.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const customToken = await firebaseAdmin.auth().createCustomToken(userId, { role });
        res.json({ customToken });
    } catch (error) {
        console.error('Failed to create custom token:', error);
        res.status(500).json({ error: 'Failed to generate auth token' });
    }
}));

// Seed admin user endpoint - protected and disabled in production
app.get('/api/seed-admin', asyncHandler(async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Seed-admin is disabled in production' });
    }
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
}));

// Backup endpoint - protected
app.get('/api/backup', authenticateToken, authorizeRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
    try {
        const { generateBackup } = await import('./services/backup');
        const backupData = await generateBackup();
        
        // Form a consistent filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `hcms-backup-${timestamp}.json`;
        
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json');
        
        res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
        console.error('Backup API error:', error);
        res.status(500).json({ error: 'Failed to generate backup' });
    }
}));

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

/* ==================== VERRITALK ATTENDANCE SYNC ==================== */

app.post(
    '/api/attendance/mark-present',
    asyncHandler(async (req: Request, res: Response) => {
        const { 
            participant_identity, 
            participant_name, 
            room_name, 
            join_time, 
            event_type, 
            training_id,
            leave_time,
            duration_seconds 
        } = req.body;

        console.log(`[attendance/sync] Received ${event_type} for ${participant_identity} in ${room_name} (Training: ${training_id})`);

        if (!participant_identity) {
            return res.status(400).json({ error: 'Missing participant_identity' });
        }

        // 1. Determine User Role and Collection
        let userRole: 'teacher' | 'mentor' | null = null;
        let userData = await db.findById(Collections.TEACHERS, participant_identity);
        if (userData) {
            userRole = 'teacher';
        } else {
            userData = await db.findById(Collections.MENTORS, participant_identity);
            if (userData) userRole = 'mentor';
        }

        if (!userData) {
            console.warn(`[attendance/sync] User ${participant_identity} not found in HCMS`);
            return res.status(404).json({ error: 'User not found in HCMS' });
        }

        const attendanceCollection = userRole === 'mentor' 
            ? Collections.MENTOR_TRAINING_ATTENDANCE 
            : Collections.TRAINING_ATTENDANCE;

        // 2. Correlation Logic
        const assignmentCollection = userRole === 'mentor' 
            ? Collections.MENTOR_TRAINING_ASSIGNMENTS 
            : Collections.TRAINING_ASSIGNMENTS;
        
        let assignmentFilter: any = {};
        if (userRole === 'mentor') assignmentFilter.mentor_id = participant_identity;
        else assignmentFilter.teacher_id = participant_identity;

        // If training_id is provided, prioritize it
        if (training_id) {
            assignmentFilter.training_program_id = training_id;
        } else {
            // Only look for active-ish assignments if training_id not specified
            assignmentFilter.status = { $in: ['assigned', 'in_progress', 'active'] };
        }

        // Find the most recent matching assignment
        const assignment = await db.findOne(assignmentCollection, assignmentFilter);
        
        let targetTrainingId = training_id;
        let assignmentId = '';

        if (assignment) {
            targetTrainingId = assignment.training_program_id;
            assignmentId = assignment.id!;
        }

        if (!targetTrainingId || !assignmentId) {
            console.warn(`[attendance/sync] No active assignment for ${participant_identity}. Filter:`, JSON.stringify(assignmentFilter));
            return res.status(400).json({ error: 'No active training assignment found for this participant' });
        }

        // 3. Update or Insert Attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceFilter: any = {
            training_program_id: targetTrainingId,
            assignment_id: assignmentId,
            attendance_date: today
        };
        if (userRole === 'mentor') attendanceFilter.mentor_id = participant_identity;
        else attendanceFilter.teacher_id = participant_identity;

        const existingRecord = await db.findOne(attendanceCollection, attendanceFilter);

        if (event_type === 'joined') {
            if (existingRecord) {
                // Update to present if it was anything else
                await db.updateById(attendanceCollection, existingRecord.id!, {
                    status: 'present',
                    notes: `Joined via VerriTalk: ${room_name}`,
                    updated_at: new Date().toISOString()
                });
                return res.json({ success: true, message: 'Existing attendance updated' });
            } else {
                // Create new record
                const newRecord: any = {
                    ...attendanceFilter,
                    status: 'present',
                    joined_at: join_time,
                    notes: `Auto-marked present via VerriTalk room: ${room_name}`,
                    created_at: new Date().toISOString()
                };
                if (userRole === 'teacher') {
                    newRecord.teacher_id = participant_identity;
                    newRecord.school_id = userData.school_id;
                } else {
                    newRecord.mentor_id = participant_identity;
                }
                
                await db.insertOne(attendanceCollection, newRecord);
                return res.status(201).json({ success: true, message: 'New attendance record created' });
            }
        } else if (event_type === 'left') {
            if (existingRecord) {
                await db.updateById(attendanceCollection, existingRecord.id!, {
                    leave_time: leave_time,
                    duration_seconds: duration_seconds,
                    notes: (existingRecord.notes || '') + ` | Left: ${new Date(leave_time).toLocaleTimeString()}`,
                    updated_at: new Date().toISOString()
                });
                return res.json({ success: true, message: 'Attendance record updated with leave time' });
            }
        }

        res.json({ success: true });
    })
);

/* ==================== GENERIC CRUD (PROTECTED) ==================== */

// Count documents
app.get(
    '/api/:collection/count',
    authenticateToken,
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
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
        const { collection } = req.params;
        const { filter, sort, limit, skip } = req.query;

        const filterObj = filter ? JSON.parse(filter as string) : {};
        const sortObj = sort ? JSON.parse(sort as string) : undefined;
        const limitNum = limit ? parseInt(limit as string) : undefined;
        const skipNum = skip ? parseInt(skip as string) : undefined;

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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
    authorizeRoles('admin'),
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
    authenticateToken,
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
    authenticateToken,
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
            db.count(Collections.MENTORS, teacherFilter),
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
// Start the server for Railway/production
if (!process.env.NETLIFY) {
    const server = app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API available at http://0.0.0.0:${PORT}/api`);
        console.log('📂 Current directory:', process.cwd());
    });
}

export default app;
