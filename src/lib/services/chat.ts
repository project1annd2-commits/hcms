import { db } from './db';
import { Collections } from '../constants';
import { ChatMessage, ChatSession } from '../models';

export const chatService = {
    // Create or get existing chat session
    async getOrCreateSession(teacherId: string, employeeId: string, schoolId: string): Promise<ChatSession> {
        const sessions = await db.find<ChatSession>(Collections.CHAT_SESSIONS, {
            teacher_id: teacherId,
            employee_id: employeeId
        });

        if (sessions && sessions.length > 0) {
            return sessions[0];
        }

        const newSession: Omit<ChatSession, 'id' | '_id'> = {
            teacher_id: teacherId,
            employee_id: employeeId,
            school_id: schoolId,
            unread_count_teacher: 0,
            unread_count_employee: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const createdSession = await db.insertOne(Collections.CHAT_SESSIONS, newSession);
        return createdSession;
    },

    async getOrCreateSupportSession(userId: string, _userType: 'teacher' | 'employee', schoolId?: string): Promise<ChatSession> {
        // Special session for technical support (can use a reserved employee ID or type)
        const supportEmployeeId = 'system_support';
        const sessions = await db.find<ChatSession>(Collections.CHAT_SESSIONS, {
            teacher_id: userId,
            employee_id: supportEmployeeId
        });

        if (sessions && sessions.length > 0) {
            return sessions[0];
        }

        const newSession: Omit<ChatSession, 'id' | '_id'> = {
            teacher_id: userId,
            employee_id: supportEmployeeId,
            school_id: schoolId,
            unread_count_teacher: 0,
            unread_count_employee: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        return await db.insertOne(Collections.CHAT_SESSIONS, newSession);
    },

    // Send a message
    async sendMessage(sessionId: string, senderId: string, senderType: 'teacher' | 'employee', content: string) {
        const message: Omit<ChatMessage, 'id' | '_id'> = {
            session_id: sessionId,
            sender_id: senderId,
            sender_type: senderType,
            content,
            read_at: null,
            created_at: new Date().toISOString()
        };

        await db.insertOne(Collections.CHAT_MESSAGES, message);

        // Update session with last message and increment unread count
        const session = await db.findById<ChatSession>(Collections.CHAT_SESSIONS, sessionId);
        if (session) {
            const updateData: Partial<ChatSession> = {
                last_message: content,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (senderType === 'teacher') {
                updateData.unread_count_employee = (session.unread_count_employee || 0) + 1;
            } else {
                updateData.unread_count_teacher = (session.unread_count_teacher || 0) + 1;
            }

            await db.updateById(Collections.CHAT_SESSIONS, sessionId, updateData);
        }
    },

    // Mark messages as read
    async markAsRead(sessionId: string, readerType: 'teacher' | 'employee') {
        const session = await db.findById<ChatSession>(Collections.CHAT_SESSIONS, sessionId);
        if (!session) return;

        // Reset unread count for the reader
        const updateData: Partial<ChatSession> = {};
        if (readerType === 'teacher') {
            updateData.unread_count_teacher = 0;
        } else {
            updateData.unread_count_employee = 0;
        }
        await db.updateById(Collections.CHAT_SESSIONS, sessionId, updateData);

        // Mark all messages as read (optional, might be expensive if many messages)
        // For now, we rely on session unread counts for UI badges
    },

    // Get messages for a session
    async getMessages(sessionId: string): Promise<ChatMessage[]> {
        return await db.find<ChatMessage>(Collections.CHAT_MESSAGES,
            { session_id: sessionId },
            { sort: { created_at: 1 } }
        );
    }
};
