# Railway Deployment Guide

## Prerequisites
- Railway account (sign up at railway.app)
- GitHub account (for connecting your repository)

## Setup Steps

### 1. Push Your Code to GitHub
```bash
git add -A
git commit -m "Configure for Railway deployment"
git push origin main
```

###  2. Deploy on Railway

1. **Go to Railway**: https://railway.app/
2. **Click "Start a New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Connect your GitHub account** if not already connected
5. **Select this repository**

### 3. Configure Environment Variables

After deployment starts, click on your project and add these environment variables:

```
MONGODB_URI=mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true
MONGODB_DB_NAME=hcms_db
PORT=5000
```

**To add variables:**
- Click on your service
- Go to "Variables" tab
- Click "New Variable"
- Add each variable above

### 4. Trigger Redeploy

After adding environment variables:
- Go to "Deployments" tab
- Click the three dots on the latest deployment
- Select "Redeploy"

### 5. Access Your Application

Once deployed:
- Railway will provide a URL like: `https://your-app.up.railway.app`
- Your API will be at: `https://your-app.up.railway.app/api`
- Seed admin user: Visit `https://your-app.up.railway.app/api/seed-admin`
- Login with: `admin` / `admin123`

## Build Configuration

Railway automatically detects:
- Frontend: Built with `npm run build` (Vite)
- Backend: Compiled TypeScript in `server/` directory
- Start command: `npm start` (runs `node server/dist/index.js`)

## Troubleshooting

### If deployment fails:
1. Check the build logs in Railway dashboard
2. Ensure all environment variables are set
3. Verify MongoDB connection string is correct

### If MongoDB connection fails:
- Check that MongoDB server at `159.41.225.248:27017` is accessible
- Verify credentials are correct
- Check firewall rules allow Railway's IP addresses

## What's Different from Vercel?

- ✅ **Traditional Node.js server** instead of serverless functions
- ✅ **No caching issues** - always builds fresh
- ✅ **Direct Express app** - no serverless wrappers needed
- ✅ **Better for full-stack apps** with WebSocket support if needed later
