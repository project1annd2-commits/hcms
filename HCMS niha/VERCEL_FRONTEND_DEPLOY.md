# Vercel Frontend Deployment Guide

## Quick Deploy Steps

### 1. Commit the Updated Config
```bash
git add vercel.json
git commit -m "Configure Vercel for frontend deployment"
git push origin main
```

### 2. Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/
2. **Sign in** (use GitHub account)
3. **Click "Add New..."** → **"Project"**
4. **Import your GitHub repository**
5. **Configure the project:**
   - Framework Preset: **Vite**
   - Root Directory: `.` (leave as is)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   
6. **Add Environment Variable:**
   - Click "Environment Variables"
   - Key: `VITE_API_URL`
   - Value: `https://your-railway-backend-url.up.railway.app`
   - ⚠️ **IMPORTANT:** Replace with your actual Railway URL!

7. **Click "Deploy"**

### 3. What to Expect

- Build time: ~2-3 minutes
- You'll get a URL like: `https://your-project.vercel.app`
- Every Git push will auto-deploy

### 4. Test Your Deployment

Once deployed:
1. Visit your Vercel URL
2. You should see your login page
3. Login with:
   - Username: `admin`
   - Password: `admin123`

### 5. Get Your Railway Backend URL

If you haven't noted it yet:
1. Go to https://railway.app/
2. Open your project
3. Click on your service
4. Look for "Domains" or "Public URL"
5. Copy that URL (e.g., `https://hcms-production.up.railway.app`)

## Troubleshooting

### If login fails:
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly in Vercel
- Make sure Railway backend is running (`/api/health` should work)

### If you get CORS errors:
- The backend at `server/src/index.ts` already has `app.use(cors())` 
- This allows all origins, so CORS should work

### Need to redeploy:
- Vercel → Your Project → Deployments → Click "..." → Redeploy

## Environment Variables Reference

| Variable | Value | Where |
|----------|-------|-------|
| `VITE_API_URL` | Your Railway backend URL | Vercel |
| `MONGODB_URI` | Your MongoDB connection string | Railway |
| `MONGODB_DB_NAME` | `hcms_db` | Railway |
| `PORT` | `5000` | Railway |

---

**Once deployed, share your Vercel URL and I'll help verify everything is working!** 🚀
