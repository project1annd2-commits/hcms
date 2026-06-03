"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./services/db");
const mongodb_1 = require("./config/mongodb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const firebase_admin_1 = require("./services/firebase-admin");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
// Async wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
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
// Login for admin or employee (role = 'admin' | 'employee')
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    console.log(`[auth/login] Attempting login for username: ${username}`);
    const firestore = firebase_admin_1.firebaseAdmin.firestore();
    const usersSnapshot = await firestore.collection('users').where('username', '==', username).limit(1).get();
    if (usersSnapshot.empty) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    const userDoc = usersSnapshot.docs[0];
    const userData = { id: userDoc.id, ...userDoc.data() };
    if (!userData.is_active) {
        return res.status(401).json({ error: 'Account is inactive' });
    }
    // Verify password (supports hash or plaintext passcode)
    const storedPasscode = userData.plain_passcode || userData.passcode;
    const isCorrect = (userData.password_hash && await bcryptjs_1.default.compare(password, userData.password_hash)) ||
        (storedPasscode && storedPasscode === password);
    if (!isCorrect) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    // Get permissions
    const permsSnapshot = await firestore.collection('permissions').where('user_id', '==', userData.id).limit(1).get();
    let permissions = permsSnapshot.empty ? null : { id: permsSnapshot.docs[0].id, ...permsSnapshot.docs[0].data() };
    // Generate Firebase Custom Token
    const customToken = await firebase_admin_1.firebaseAdmin.auth().createCustomToken(userData.id, {
        role: userData.role || 'admin',
    });
    res.json({ user: userData, permissions, customToken });
}));
// Participant login verification (Teacher, Mentor, Management) - Step 1: Verify Phone
app.post('/api/auth/verify-phone', asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const firestore = firebase_admin_1.firebaseAdmin.firestore();
    const normalizedInput = phone.replace(/\s+/g, '');
    const findInCollection = async (collectionName) => {
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
    const userData = { id: userDoc.id, ...userDoc.data() };
    const hasPassword = !!(userData.plain_passcode || userData.password_hash || userData.passcode);
    res.json({ type, data: userData, hasPassword });
}));
// Participant login verification - Step 2: Verify Password & Get Token
app.post('/api/auth/participant-login', asyncHandler(async (req, res) => {
    const { userId, type, password } = req.body;
    const firestore = firebase_admin_1.firebaseAdmin.firestore();
    const collectionMap = {
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
    const userData = doc.data();
    const storedPasscode = userData.plain_passcode || userData.passcode;
    const isCorrect = (userData.password_hash && await bcryptjs_1.default.compare(password, userData.password_hash)) ||
        (storedPasscode && storedPasscode === password);
    if (!isCorrect) {
        return res.status(401).json({ error: 'Incorrect password' });
    }
    const customToken = await firebase_admin_1.firebaseAdmin.auth().createCustomToken(userId, { role: type });
    res.json({ success: true, customToken });
}));
// Firebase custom token endpoint - for frontend to silently sign into Firebase Auth
app.post('/api/auth/firebase-token', asyncHandler(async (req, res) => {
    const { userId, role } = req.body;
    console.log(`[firebase-token] Received request for userId: ${userId}, role: ${role}`);
    if (!userId || !role) {
        return res.status(400).json({ error: 'userId and role are required' });
    }
    // Verify user exists via Firebase Admin Firestore
    const firestore = firebase_admin_1.firebaseAdmin.firestore();
    const collectionMap = {
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
        const customToken = await firebase_admin_1.firebaseAdmin.auth().createCustomToken(userId, { role });
        res.json({ customToken });
    }
    catch (error) {
        console.error('Failed to create custom token:', error);
        res.status(500).json({ error: 'Failed to generate auth token' });
    }
}));
// Seed admin user endpoint
app.get('/api/seed-admin', asyncHandler(async (req, res) => {
    const username = 'admin';
    const password = 'admin123';
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const existingUser = await db_1.db.findOne(mongodb_1.Collections.USERS, { username });
    let userId;
    if (existingUser) {
        await db_1.db.updateOne(mongodb_1.Collections.USERS, { username }, {
            $set: {
                password_hash: passwordHash,
                is_active: true,
                updated_at: new Date().toISOString()
            }
        });
        userId = existingUser.id;
    }
    else {
        const newUser = await db_1.db.insertOne(mongodb_1.Collections.USERS, {
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
    const existingPerms = await db_1.db.findOne(mongodb_1.Collections.PERMISSIONS, { user_id: userId });
    if (existingPerms) {
        await db_1.db.updateOne(mongodb_1.Collections.PERMISSIONS, { user_id: userId }, { $set: permissions });
    }
    else {
        await db_1.db.insertOne(mongodb_1.Collections.PERMISSIONS, permissions);
    }
    res.json({
        success: true,
        message: 'Admin user created/updated',
        credentials: { username: 'admin', password: 'admin123' }
    });
}));
// Backup endpoint
app.get('/api/backup', asyncHandler(async (req, res) => {
    try {
        const { generateBackup } = await Promise.resolve().then(() => __importStar(require('./services/backup')));
        const backupData = await generateBackup();
        // Form a consistent filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `hcms-backup-${timestamp}.json`;
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(backupData, null, 2));
    }
    catch (error) {
        console.error('Backup API error:', error);
        res.status(500).json({ error: 'Failed to generate backup' });
    }
}));
/* ==================== TRAINING JOIN ==================== */
app.post('/api/training/join', asyncHandler(async (req, res) => {
    const { teacherId, assignmentId } = req.body;
    // Verify teacher exists and is active
    const teacher = await db_1.db.findOne(mongodb_1.Collections.TEACHERS, { id: teacherId, status: 'active' });
    if (!teacher)
        return res.status(404).json({ error: 'Teacher not found' });
    // Verify assignment exists and belongs to this teacher
    const assignment = await db_1.db.findOne(mongodb_1.Collections.TRAINING_ASSIGNMENTS, {
        id: assignmentId,
        teacher_id: teacherId,
    });
    if (!assignment)
        return res.status(404).json({ error: 'Assignment not found or not assigned to this teacher' });
    // Insert attendance if not already present
    const existing = await db_1.db.findOne(mongodb_1.Collections.TRAINING_ATTENDANCE, {
        teacher_id: teacherId,
        assignment_id: assignmentId,
    });
    if (existing)
        return res.status(200).json({ message: 'Already joined', attendance: existing });
    const attendance = await db_1.db.insertOne(mongodb_1.Collections.TRAINING_ATTENDANCE, {
        teacher_id: teacherId,
        assignment_id: assignmentId,
        status: 'in_progress',
        joined_at: new Date().toISOString(),
    });
    res.status(201).json({ message: 'Joined training', attendance });
}));
/* ==================== GENERIC CRUD ==================== */
// Count documents
app.get('/api/:collection/count', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const { filter } = req.query;
    let filterObj = {};
    try {
        filterObj = filter ? JSON.parse(filter) : {};
    }
    catch {
        filterObj = {};
    }
    const count = await db_1.db.count(collection, filterObj);
    res.json({ count });
}));
// Get all documents
app.get('/api/:collection', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const { filter, sort, limit, skip } = req.query;
    const filterObj = filter ? JSON.parse(filter) : {};
    const sortObj = sort ? JSON.parse(sort) : undefined;
    const limitNum = limit ? parseInt(limit) : undefined;
    const skipNum = skip ? parseInt(skip) : undefined;
    const results = await db_1.db.find(collection, filterObj, {
        sort: sortObj,
        limit: limitNum,
        skip: skipNum,
    });
    res.json(results);
}));
// Get single document by id
app.get('/api/:collection/:id', asyncHandler(async (req, res) => {
    const { collection, id } = req.params;
    const result = await db_1.db.findById(collection, id);
    if (!result)
        return res.status(404).json({ error: 'Document not found' });
    res.json(result);
}));
// Create document
app.post('/api/:collection', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const document = req.body;
    const result = await db_1.db.insertOne(collection, document);
    res.status(201).json(result);
}));
// Bulk create
app.post('/api/:collection/bulk', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const documents = req.body;
    const results = await db_1.db.insertMany(collection, documents);
    res.status(201).json(results);
}));
// Update by id
app.put('/api/:collection/:id', asyncHandler(async (req, res) => {
    const { collection, id } = req.params;
    const updates = req.body;
    const success = await db_1.db.updateById(collection, id, updates);
    if (!success)
        return res.status(404).json({ error: 'Document not found or not updated' });
    res.json({ success: true, id });
}));
// Delete by id
app.delete('/api/:collection/:id', asyncHandler(async (req, res) => {
    const { collection, id } = req.params;
    const success = await db_1.db.deleteById(collection, id);
    if (!success)
        return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true, id });
}));
// Upsert
app.post('/api/:collection/upsert', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const { filter, document } = req.body;
    const result = await db_1.db.upsert(collection, filter, document);
    res.json(result);
}));
/* ==================== DASHBOARD STATS ==================== */
app.get('/api/dashboard/stats', asyncHandler(async (req, res) => {
    const { role, assignedSchools } = req.query;
    let schoolFilter = {};
    let teacherFilter = {};
    if (role !== 'admin' && assignedSchools) {
        const schoolIds = JSON.parse(assignedSchools);
        schoolFilter = { id: { $in: schoolIds } };
        teacherFilter = { school_id: { $in: schoolIds } };
    }
    const [schools, teachers, mentors, programs, assignments] = await Promise.all([
        db_1.db.count(mongodb_1.Collections.SCHOOLS, schoolFilter),
        db_1.db.count(mongodb_1.Collections.TEACHERS, teacherFilter),
        db_1.db.count(mongodb_1.Collections.MENTORS, teacherFilter),
        db_1.db.count(mongodb_1.Collections.TRAINING_PROGRAMS, { status: 'active' }),
        db_1.db.find(mongodb_1.Collections.TRAINING_ASSIGNMENTS, {}),
    ]);
    res.json({ schools, teachers, mentors, programs, assignments });
}));
/* ==================== ERROR HANDLING ==================== */
app.use((err, req, res, next) => {
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
exports.default = app;
