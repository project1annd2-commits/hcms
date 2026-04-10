# HCMS API Documentation

## Overview
This document provides comprehensive documentation for the Healthcare Management System (HCMS) API. The API is built using Express.js and connects to MongoDB (via Firebase Firestore) for data storage.

---

## Total APIs: 23

---

## API List

### 1. Root Health Check
| Attribute | Value |
|-----------|-------|
| **API Name** | Root Health Check |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/` |
| **Sample Request** | `GET /` |
| **Sample Response** | `{ "status": "ok", "message": "HCMS API Server is running" }` |

---

### 2. API Health Check
| Attribute | Value |
|-----------|-------|
| **API Name** | API Health Check |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/api/health` |
| **Sample Request** | `GET /api/health` |
| **Sample Response** | `{ "status": "ok", "timestamp": "2025-04-08T10:00:00.000Z", "env": { "hasMongoUri": true, "hasMongoDbName": true } }` |

---

### 3. Admin Login
| Attribute | Value |
|-----------|-------|
| **API Name** | Admin Login |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/auth/login` |
| **Sample Request (Body)** | `{ "username": "admin", "password": "admin123" }` |
| **Sample Response** | `{ "user": { "id": "...", "username": "admin", "role": "admin", "is_active": true }, "permissions": { "can_delete_schools": true, ... }, "customToken": "..." }` |

---

### 4. Verify Phone (Participant)
| Attribute | Value |
|-----------|-------|
| **API Name** | Verify Phone (Participant) |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/auth/verify-phone` |
| **Sample Request (Body)** | `{ "phone": "0501234567" }` |
| **Sample Response** | `{ "type": "teacher", "data": { "id": "...", "phone": "0501234567", ... }, "hasPassword": true }` |

---

### 5. Participant Login
| Attribute | Value |
|-----------|-------|
| **API Name** | Participant Login |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/auth/participant-login` |
| **Sample Request (Body)** | `{ "userId": "teacher_id_123", "type": "teacher", "password": "pass123" }` |
| **Sample Response** | `{ "success": true, "customToken": "..." }` |

---

### 6. Firebase Token
| Attribute | Value |
|-----------|-------|
| **API Name** | Firebase Token |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/auth/firebase-token` |
| **Sample Request (Body)** | `{ "userId": "user_id_123", "role": "admin" }` |
| **Sample Response** | `{ "customToken": "..." }` |

---

### 7. Seed Admin User
| Attribute | Value |
|-----------|-------|
| **API Name** | Seed Admin User |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/api/seed-admin` |
| **Sample Request** | `GET /api/seed-admin` |
| **Sample Response** | `{ "success": true, "message": "Admin user created/updated", "credentials": { "username": "admin", "password": "admin123" } }` |

---

### 8. Backup
| Attribute | Value |
|-----------|-------|
| **API Name** | Backup |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/api/backup` |
| **Sample Request** | `GET /api/backup` |
| **Sample Response** | Returns JSON file download with name `hcms-backup-YYYY-MM-DD.json` |

---

### 9. Join Training
| Attribute | Value |
|-----------|-------|
| **API Name** | Join Training |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/training/join` |
| **Sample Request (Body)** | `{ "teacherId": "teacher_id_123", "assignmentId": "assignment_id_456" }` |
| **Sample Response** | `{ "message": "Joined training", "attendance": { "teacher_id": "...", "assignment_id": "...", "status": "in_progress", "joined_at": "..." } }` |

---

### 10. Count Documents
| Attribute | Value |
|-----------|-------|
| **API Name** | Count Documents |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/api/:collection/count` |
| **Query Parameters** | `filter` (optional JSON string) |
| **Sample Request** | `GET /api/schools/count?filter={"status":"active"}` |
| **Sample Response** | `{ "count": 25 }` |

---

### 11. Get All Documents
| Attribute | Value |
|-----------|-------|
| **API Name** | Get All Documents |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/api/:collection` |
| **Query Parameters** | `filter`, `sort`, `limit`, `skip` (all optional) |
| **Sample Request** | `GET /api/schools?filter={"status":"active"}&limit=10&skip=0&sort={"name":1}` |
| **Sample Response** | `[ { "id": "...", "name": "School A", "status": "active", ... }, ... ]` |

---

### 12. Get Document By ID
| Attribute | Value |
|-----------|-------|
| **API Name** | Get Document By ID |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/api/:collection/:id` |
| **Sample Request** | `GET /api/schools/school_123` |
| **Sample Response** | `{ "id": "school_123", "name": "School A", "address": "123 Street", ... }` |

---

### 13. Create Document
| Attribute | Value |
|-----------|-------|
| **API Name** | Create Document |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/:collection` |
| **Sample Request (Body)** | `{ "name": "New School", "address": "123 Street", "city": "City", "status": "active" }` |
| **Sample Response** | `{ "id": "new_doc_id", ... }` |

---

### 14. Bulk Create Documents
| Attribute | Value |
|-----------|-------|
| **API Name** | Bulk Create Documents |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/:collection/bulk` |
| **Sample Request (Body)** | `[ { "name": "School 1" }, { "name": "School 2" } ]` |
| **Sample Response** | `{ "insertedCount": 2, "insertedIds": [ "id1", "id2" ] }` |

---

### 15. Update Document By ID
| Attribute | Value |
|-----------|-------|
| **API Name** | Update Document By ID |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | PUT |
| **Endpoint** | `/api/:collection/:id` |
| **Sample Request (Body)** | `{ "name": "Updated School Name", "status": "inactive" }` |
| **Sample Response** | `{ "success": true, "id": "school_123" }` |

---

### 16. Delete Document By ID
| Attribute | Value |
|-----------|-------|
| **API Name** | Delete Document By ID |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | DELETE |
| **Endpoint** | `/api/:collection/:id` |
| **Sample Request** | `DELETE /api/schools/school_123` |
| **Sample Response** | `{ "success": true, "id": "school_123" }` |

---

### 17. Upsert Document
| Attribute | Value |
|-----------|-------|
| **API Name** | Upsert Document |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | POST |
| **Endpoint** | `/api/:collection/upsert` |
| **Sample Request (Body)** | `{ "filter": { "name": "School A" }, "document": { "name": "School A", "city": "New City" } }` |
| **Sample Response** | `{ "id": "existing_or_new_id", "matchedCount": 1, "modifiedCount": 1 }` |

---

### 18. Dashboard Stats
| Attribute | Value |
|-----------|-------|
| **API Name** | Dashboard Stats |
| **Backend Location** | `HCMS niha\server\src\index.ts` |
| **API Method** | GET |
| **Endpoint** | `/api/dashboard/stats` |
| **Query Parameters** | `role` (admin/teacher/mentor), `assignedSchools` (JSON array string) |
| **Sample Request** | `GET /api/dashboard/stats?role=admin` or `GET /api/dashboard/stats?role=teacher&assignedSchools=["school1","school2"]` |
| **Sample Response** | `{ "schools": 10, "teachers": 50, "mentors": 20, "programs": 5, "assignments": [...] }` |

---

## Backend Location Summary

| Backend | Location |
|---------|----------|
| **Main Server** | `HCMS niha\server\src\index.ts` |
| **Database Service** | `HCMS niha\server\src\services\db.ts` |
| **MongoDB Config** | `HCMS niha\server\src\config\mongodb.ts` |
| **Firebase Admin** | `HCMS niha\server\src\services\firebase-admin.ts` |
| **Backup Service** | `HCMS niha\server\src\services\backup.ts` |

---

## Common Collections (for Generic CRUD APIs)

| Collection Name | Description |
|----------------|-------------|
| `schools` | School records |
| `teachers` | Teacher data |
| `mentors` | Mentor data |
| `management` | Management personnel |
| `users` | Admin/Employee users |
| `training_programs` | Training programs |
| `training_assignments` | Training assignments |
| `training_attendance` | Training attendance records |
| `permissions` | User permissions |

---

## Authentication Notes

- Most endpoints require Firebase authentication via custom token
- Admin/Employee login uses `/api/auth/login` with username/password
- Participants (Teacher/Mentor/Management) use `/api/auth/verify-phone` then `/api/auth/participant-login`
- Firebase Custom Token is generated at `/api/auth/firebase-token`

---

*Document generated on: 2026-04-08*
