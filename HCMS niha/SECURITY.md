# HCMS Security Guide

## 🚨 CRITICAL SECURITY ACTIONS REQUIRED

This document outlines the security vulnerabilities that have been addressed and the actions you MUST take to secure your HCMS deployment.

## ✅ COMPLETED SECURITY FIXES

### 1. **Authentication & Authorization**
- ✅ All API endpoints now require JWT authentication
- ✅ Role-based access control (RBAC) implemented
- ✅ Permission-based authorization for sensitive operations
- ✅ Server-side password verification using bcrypt
- ✅ Removed client-side authentication

### 2. **API Security**
- ✅ Removed generic CRUD endpoints (`/api/:collection/*`)
- ✅ Removed unauthenticated admin bootstrap endpoint (`/api/seed-admin`)
- ✅ All data endpoints now require authentication and specific permissions
- ✅ CORS properly configured

### 3. **Password Security**
- ✅ Passwords hashed using bcrypt (10 salt rounds)
- ✅ Removed plaintext password support
- ✅ Password hashing happens server-side only
- ✅ No passwords sent in responses

### 4. **Configuration Security**
- ✅ MongoDB URI moved to environment variables
- ✅ JWT secret moved to environment variables
- ✅ Removed hardcoded credentials from source code
- ✅ Firebase dependencies removed (using MongoDB only)

## 🔄 IMMEDIATE ACTIONS REQUIRED

### 1. **Set Up Environment Variables** (REQUIRED)

The application now requires environment variables to be set. Create a `server/.env` file:

```bash
# Copy the example file
cp server/.env.example server/.env

# Edit with your values
nano server/.env
```

#### MongoDB Configuration
```env
# Use your existing MongoDB connection string
# Format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_URI=your_existing_mongodb_connection_string
MONGODB_DB_NAME=hcms_db
```

#### JWT Secret (REQUIRED - Generate a new one)
```bash
# Generate a strong random secret
openssl rand -base64 32

# Copy the output and add to your .env file
JWT_SECRET=<paste-the-generated-secret-here>
```

**Note:** The JWT secret is critical for security. Do not use the example value from `.env.example`.

### 2. **Update Environment Variables**

Create a `.env` file in your server directory with the following:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://<new-username>:<new-password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=hcms_db

# JWT Secret (GENERATE A NEW ONE!)
JWT_SECRET=<your-32-character-random-secret>

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=5000
NODE_ENV=production
```

### 3. **Force Password Resets for All Users**

Since plaintext passwords may have been exposed, you MUST reset all user passwords:

```bash
# Option 1: Use MongoDB Compass or similar tool
# 1. Connect to your MongoDB database
# 2. For each user in the 'users' collection:
#    - Generate a new temporary password
#    - Hash it using bcrypt
#    - Update the password_hash field
#    - Notify the user of their temporary password

# Option 2: Create a password reset script
# See scripts/reset-passwords.js for an example
```

### 4. **Delete Sensitive Files**

Remove these files from your repository if they exist:

```bash
# Firebase service account keys
rm hcms-*-firebase-adminsdk-*.json

# Any .env files with real credentials
rm .env
rm server/.env

# Database backups (if they contain sensitive data)
rm database-backup-*.json
```

### 5. **Update .gitignore**

Ensure your `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.production

# Firebase credentials
*firebase-adminsdk*.json
service-account.json
*.json.key

# Database files
*.json.bak
*.json.backup
database-backup-*.json

# Secrets
*.pem
*.key
secrets/
```

## 🛡️ ONGOING SECURITY BEST PRACTICES

### 1. **Environment Variables**
- Never commit `.env` files to version control
- Use environment variable management in production
- Rotate secrets regularly (every 90 days recommended)

### 2. **Password Policy**
- Minimum 8 characters
- Require uppercase, lowercase, numbers, and special characters
- Implement account lockout after failed attempts
- Use bcrypt with cost factor of 10 or higher

### 3. **API Security**
- Always use HTTPS in production
- Implement rate limiting
- Use helmet.js for security headers
- Validate and sanitize all inputs

### 4. **Monitoring**
- Log authentication attempts
- Monitor for suspicious activity
- Set up alerts for failed login attempts
- Regular security audits

### 5. **Database Security**
- Use IP whitelisting in MongoDB Atlas
- Enable MongoDB encryption at rest
- Regular backups (encrypted)
- Principle of least privilege for database users

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All credentials have been rotated
- [ ] `.env` file is in `.gitignore`
- [ ] JWT secret is a strong random string (32+ characters)
- [ ] MongoDB connection uses strong password
- [ ] All users have reset their passwords
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are set
- [ ] Monitoring and logging are configured

## 📞 SECURITY CONTACT

If you discover a security vulnerability, please report it responsibly:

1. Do not open a public issue
2. Email: [your-security-email@example.com]
3. Include details about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## 📚 ADDITIONAL RESOURCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated:** 2026-04-21  
**Security Status:** ✅ CRITICAL ISSUES FIXED - ACTION REQUIRED