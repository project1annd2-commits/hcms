# GitHub Pages Deployment Guide

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository: https://github.com/Hauna123/HCMS123
2. Click **"Settings"** tab
3. Scroll to **"Pages"** in the left sidebar
4. Under **"Build and deployment"**:
   - Source: **GitHub Actions** (select this!)
   - NOT "Deploy from a branch"

### 2. Add Secret for Backend URL

1. Still in Settings, click **"Secrets and variables"** → **"Actions"**
2. Click **"New repository secret"**
3. Add:
   - Name: `VITE_API_URL`
   - Value: Your Railway backend URL (e.g., `https://hcms-production.up.railway.app`)
4. Click **"Add secret"**

### 3. Deploy

Just push your code:

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "Add GitHub Pages deployment workflow"
git push origin main
```

GitHub Actions will automatically:
- Build your Vite app
- Deploy to GitHub Pages
- Give you a URL

### 4. Access Your Site

Your frontend will be available at:
```
https://hauna123.github.io/HCMS123/
```

Or check the "Deployments" section in your GitHub repo to see the exact URL.

---

## Advantages of GitHub Pages

✅ **Free** - Unlimited bandwidth  
✅ **Fast** - CDN worldwide  
✅ **Auto-deploy** - On every Git push  
✅ **HTTPS** - Automatic SSL  
✅ **Simple** - No account needed (uses GitHub)

---

## Troubleshooting

### If deployment fails:
1. Go to **"Actions"** tab in GitHub
2. Click on the failed workflow
3. Check the logs for errors

### If you see a blank page:
- Make sure `VITE_API_URL` secret is set correctly
- Check browser console for errors

### To redeploy:
Just push any change to main branch, or:
1. Go to "Actions" tab
2. Click "Deploy to GitHub Pages"
3. Click "Run workflow"

---

**After you push, check the "Actions" tab to watch it deploy!** 🚀
