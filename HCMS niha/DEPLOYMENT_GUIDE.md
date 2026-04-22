# HCMS Secure Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier works)
- Git (for cloning)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd HCMS\ niha

# Install dependencies
npm install
cd server
npm install
cd ..
```

### 2. Configure Environment

```bash
# Copy example environment file
cp server/.env.example server/.env

# Edit the .env file with your values
nano server/.env
```

### 3. Configure MongoDB Connection

**If you already have a MongoDB connection string:**
- Simply copy it into your `server/.env` file as `MONGODB_URI`

**If you need to set up MongoDB:**

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Create a free account
   - Create a new cluster (M0 free tier is fine)

2. **Create Database User**
   - Go to Database Access
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Generate a secure password (save it!)
   - Grant "Read and write to any database" privilege
   - Click "Add User"

3. **Whitelist Your IP**
   - Go to Network Access
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your server's IP address only

4. **Get Connection String**
   - Go to Clusters and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `hcms_db`

### 4. Generate JWT Secret

```bash
# Generate a strong random secret
openssl rand -base64 32

# Copy the output and add to your .env file
```

### 5. Update Environment Variables

Edit `server/.env`:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=hcms_db

# JWT Secret (paste the generated secret)
JWT_SECRET=<your-32-character-secret-from-openssl>

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 6. Create Admin User

```bash
cd server
npx ts-node scripts/create-admin.ts

# Save the displayed password securely!
```

### 7. Migrate Existing Passwords (if upgrading)

If you have existing data with plaintext passwords:

```bash
npx ts-node scripts/migrate-passwords.ts

# Save the displayed temporary passwords!
```

### 8. Start the Server

```bash
# From server directory
npm run dev

# Server should start on http://localhost:5000
```

### 9. Start the Frontend

```bash
# From project root
npm run dev

# Frontend should start on http://localhost:5173
```

### 10. Test the Application

1. Open browser to `http://localhost:5173`
2. Login with admin credentials
3. Test creating users, schools, etc.

## 🔒 Security Hardening (Production)

### 1. Environment Variables

Never commit `.env` files! Use environment variable management:

**For Vercel:**
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
```

**For Railway:**
```bash
# In Railway dashboard, add variables under your project
```

**For AWS:**
```bash
# Use AWS Systems Manager Parameter Store or Secrets Manager
```

### 2. HTTPS

Always use HTTPS in production:

**For Vercel/Netlify:** Automatic HTTPS
**For Railway:** Automatic HTTPS
**For AWS/Custom Server:**
```nginx
# Nginx configuration example
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Rate Limiting

Add to `server/src/index.ts`:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Security Headers

Add helmet.js:

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet());
```

### 5. MongoDB Security

- Enable encryption at rest in MongoDB Atlas
- Use IP whitelisting (don't use 0.0.0.0/0 in production)
- Enable MongoDB auditing
- Use strong passwords (20+ characters)

## 📊 Monitoring

### 1. Application Monitoring

Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **New Relic** for performance monitoring

### 2. Database Monitoring

- Enable MongoDB Atlas alerts
- Monitor slow queries
- Set up backup alerts

### 3. Security Monitoring

- Monitor failed login attempts
- Set up alerts for suspicious activity
- Regular security audits

## 🔄 Updates and Maintenance

### Regular Updates

```bash
# Update dependencies monthly
npm update
npm audit fix

# Check for vulnerabilities
npm audit

# Update global packages
npm update -g
```

### Backup Strategy

```bash
# Automated backup script (run daily)
mongodump --uri="your-mongodb-uri" --out=/backups/hcms-$(date +%Y-%m-%d)
```

### Security Updates

- Subscribe to Node.js security releases
- Monitor npm security advisories
- Update immediately when security patches are released

## 🆘 Troubleshooting

### Common Issues

**Cannot connect to MongoDB:**
- Check connection string format
- Verify IP whitelist includes your server
- Confirm database user has correct permissions

**JWT errors:**
- Ensure JWT_SECRET is set in environment
- Check that secret is at least 32 characters

**CORS errors:**
- Verify FRONTEND_URL matches your actual frontend URL
- Check CORS configuration in server

**Port already in use:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

## 📞 Support

For security issues, see [SECURITY.md](./SECURITY.md)

For general help, check:
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)

---

## ☁️ AWS EC2 Deployment Guide

### Server Details
- **IP:** 13.51.48.107
- **SSH Key:** `C:\Users\5410\Downloads\HCMS.pem`
- **Domain:** hcms1.hauna.co.in

### Quick Deploy (From Local Machine)

```bash
# Build and deploy frontend
cd "E:\documents\hcm12.03.2025\HCM 12.03.2025\HCMS123-main\HCMS niha"
npm run build

# Upload to EC2
scp -i "C:\Users\5410\Downloads\HCMS.pem" -r dist ec2-user@13.51.48.107:/home/ec2-user/

# SSH into server and copy to correct locations
ssh -i "C:\Users\5410\Downloads\HCMS.pem" ec2-user@13.51.48.107 " \
    rm -rf /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/dist && \
    cp -r /home/ec2-user/dist /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/ && \
    sudo rm -rf /var/www/lessonplan/dist && \
    sudo cp -r /home/ec2-user/dist /var/www/lessonplan/ && \
    pm2 restart all && \
    sudo systemctl restart nginx"
```

### Manual Deploy (SSH into Server)

```bash
# SSH into EC2
ssh -i "C:\Users\5410\Downloads\HCMS.pem" ec2-user@13.51.48.107

# Pull latest code from git
cd /home/ec2-user/lessonplan/HCMS\ niha
git pull origin main

# Build frontend (with increased memory)
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Build server
cd server
npm run build

# Copy to PM2 directories
rm -rf /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/dist
cp -r dist /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/

rm -rf /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/server/dist
cp -r dist /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/server/

# Copy to nginx directory
sudo rm -rf /var/www/lessonplan/dist
sudo cp -r /home/ec2-user/lessonplan/HCMS\ niha/dist /var/www/lessonplan/

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs frontend
pm2 logs backend

# Restart services
pm2 restart all
pm2 restart frontend
pm2 restart backend

# Stop/Start
pm2 stop all
pm2 start all
```

### Troubleshooting

**Frontend not loading:**
```bash
# Check if frontend is running
pm2 status

# Restart frontend
pm2 restart frontend
```

**API not working:**
```bash
# Check backend logs
pm2 logs backend

# Restart backend
pm2 restart backend

# Check nginx
sudo systemctl status nginx
```

**Clear browser cache:**
- Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)

---

**Last Updated:** 2026-04-21  
**Version:** 2.0.0 (Secure)