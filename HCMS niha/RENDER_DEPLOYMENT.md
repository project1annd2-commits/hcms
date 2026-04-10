# Render Deployment Guide

## Prerequisites
- Render account (sign up at render.com)
- GitHub account (for connecting your repository)

## Setup Steps

### 1. Push Your Code to GitHub
```bash
git add -A
git commit -m "Configure for Render deployment"
git push origin main
```

### 2. Deploy on Render

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +"** in the top right
3. **Select "Blueprint"**
4. **Connect your GitHub repository**
5. **Render will automatically detect `render.yaml`**
6. **Click "Apply"**

### 3. Configure Environment Variables

Render will create two services from the `render.yaml`:
- **hauna-preschool-api** (Backend)
- **hauna-preschool-frontend** (Frontend)

**For the API service, add these environment variables:**

1. Click on the **"hauna-preschool-api"** service
2. Go to **"Environment"** tab
3. Add:
   ```
   MONGODB_URI=mongodb://curriculumhauna_db_user:KISSw GBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true
   MONGODB_DB_NAME=hcms_db
   ```

### 4. Wait for Deployment

- Both services will build and deploy automatically
- The API typically takes 5-10 minutes
- The frontend takes 2-5 minutes

### 5. Access Your Application

Once deployed:
- **Frontend URL**: `https://hauna-preschool-frontend.onrender.com`
- **API URL**: `https://hauna-preschool-api.onrender.com`
- **Seed admin**: Visit `https://hauna-preschool-api.onrender.com/api/seed-admin`
- **Login**: Use `admin` / `admin123`

## What Render Does Automatically

From the `render.yaml` file, Render will:
- ✅ Build both frontend and backend
- ✅ Deploy them as separate services
- ✅ Connect frontend to backend automatically
- ✅ Provide HTTPS URLs for both
- ✅ Auto-redeploy on GitHub pushes

## Advantages of Render

- ✅ **Blueprint deployment** - one YAML file deploys everything
- ✅ **Built-in SSL** - automatic HTTPS
- ✅ **Free tier available** - good for testing
- ✅ **Traditional Node.js** - no serverless complexity
- ✅ **Easy environment variables** - simple UI

## Troubleshooting

### If API deployment fails:
1. Check build logs in Render dashboard
2. Verify environment variables are set correctly
3. Ensure `MONGODB_URI` and `MONGODB_DB_NAME` are correct

### If MongoDB connection fails:
- Verify MongoDB server at `159.41.225.248:27017` is accessible from Render
- Check that credentials are correct
- Ensure firewall allows Render's IP addresses

### If frontend can't connect to API:
- Check that `VITE_API_URL` in frontend environment points to the correct API URL
- Render automatically sets this from the backend service

## Free Tier Limitations

Render's free tier:
- ⚠️ **Spins down after 15 minutes of inactivity** (cold starts take ~30 seconds)
- ✅ Good for development/testing
- 💡 Upgrade to paid tier for production use (stays always on)
