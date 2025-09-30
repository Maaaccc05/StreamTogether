# Streaming Platform - Render Deployment Guide

## Overview
This guide will help you deploy your streaming platform to Render with separate backend and frontend services.

## Prerequisites
1. Push your code to a GitHub repository
2. Create a Render account at https://render.com
3. Connect your GitHub account to Render

## Deployment Steps

### Step 1: Deploy Backend (Web Service)

1. **Create New Web Service**
   - Go to Render Dashboard → "New" → "Web Service"
   - Connect your GitHub repository
   - Choose your repository and branch (usually `main`)

2. **Configure Backend Service**
   - **Name**: `streaming-platform-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose paid for better performance)

3. **Set Environment Variables**
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = (leave empty for now, will set after frontend deployment)

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the backend URL (e.g., `https://streaming-platform-backend-abc123.onrender.com`)

### Step 2: Deploy Frontend (Static Site)

1. **Create New Static Site**
   - Go to Render Dashboard → "New" → "Static Site"
   - Connect the same GitHub repository

2. **Configure Frontend Service**
   - **Name**: `streaming-platform-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Set Environment Variables**
   - `VITE_SERVER_URL` = `https://your-backend-url.onrender.com` (use actual backend URL from Step 1)

4. **Deploy**
   - Click "Create Static Site"
   - Wait for deployment to complete
   - Note the frontend URL (e.g., `https://streaming-platform-frontend-xyz789.onrender.com`)

### Step 3: Update Backend CORS Configuration

1. **Update Backend Environment Variables**
   - Go to your backend service in Render
   - Navigate to "Environment" tab
   - Update `FRONTEND_URL` with your actual frontend URL
   - Save changes (this will trigger a redeploy)

### Step 4: Test Your Deployment

1. Visit your frontend URL
2. Create a room and test the streaming functionality
3. Test with multiple browser tabs/devices to ensure real-time sync works

## Important Notes

### Free Tier Limitations
- **Sleep Mode**: Free services sleep after 15 minutes of inactivity
- **Cold Starts**: First request after sleep takes ~30 seconds
- **Concurrent Users**: Limited performance with multiple users

### Upgrading for Production
For better performance with real users:
1. Upgrade backend to paid plan ($7/month minimum)
2. Consider upgrading frontend to paid plan for custom domain

### WebSocket Support
- Render supports WebSockets on all plans
- Socket.io will automatically fallback to polling if WebSocket fails

### Environment Variables
- Backend: `NODE_ENV`, `FRONTEND_URL`, `PORT` (auto-set)
- Frontend: `VITE_SERVER_URL`

### Custom Domains (Optional)
- Available on paid plans
- Configure in service settings
- Update CORS configuration accordingly

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure frontend URL is properly set in backend environment
2. **Connection Failed**: Check if backend URL is correctly set in frontend environment
3. **Build Failures**: Check build logs for missing dependencies or script errors

### Logs Access
- Backend logs: Service → "Logs" tab
- Frontend build logs: Service → "Events" tab

### Rolling Back
- Use "Manual Deploy" to deploy specific commits
- Environment variable changes trigger automatic redeploys

## Post-Deployment Updates

1. **Code Changes**: Push to GitHub → automatic redeploy
2. **Environment Changes**: Update in Render dashboard → manual redeploy
3. **Monitoring**: Use Render dashboard to monitor service health

## Support
- Render Documentation: https://render.com/docs
- Socket.io Documentation: https://socket.io/docs/

---

**Next Steps**: 
1. Follow the deployment steps above
2. Replace placeholder URLs with your actual Render URLs
3. Test the deployed application
4. Consider upgrading to paid plans for production use