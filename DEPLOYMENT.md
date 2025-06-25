# 🚀 Aspiro AI Deployment Guide

## Quick Deployment Options

### 🥇 **Option 1: Vercel (Recommended)**
**Free tier, easy setup, automatic HTTPS**

1. **Prerequisites:**
   - GitHub account
   - Vercel account (free)

2. **Steps:**
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **Deploy:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variable: `OPENAI_API_KEY=your-key-here`
   - Deploy!

4. **Custom Domain (Optional):**
   - Add your domain in Vercel dashboard
   - Configure DNS records as shown

---

### 🥈 **Option 2: Railway**
**Great for Python apps, $5/month after free tier**

1. **Deploy:**
   - Go to [railway.app](https://railway.app)
   - Connect GitHub repository
   - Add environment variable: `OPENAI_API_KEY`
   - Deploy automatically

2. **Benefits:**
   - Automatic database provisioning
   - Great for scaling
   - Built-in monitoring

---

### 🥉 **Option 3: Render**
**Reliable, free tier available**

1. **Deploy:**
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect GitHub repository
   - Add environment variables
   - Deploy

2. **Free Tier Limitations:**
   - Sleeps after 15 minutes of inactivity
   - Slower cold starts

---

### 🐳 **Option 4: Docker (Any Platform)**

**Build and run locally:**
```bash
# Build image
docker build -t aspiro-ai .

# Run container
docker run -d \
  -p 8000:8000 \
  -e OPENAI_API_KEY=your-key-here \
  --name aspiro-ai \
  aspiro-ai
```

**Deploy to cloud:**
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform

---

## 🔑 Environment Variables Setup

All platforms need these environment variables:

| Variable | Value | Required |
|----------|--------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ Yes |
| `PORT` | 8000 (or platform default) | ❌ Optional |

### Getting OpenAI API Key:
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login
3. Go to API Keys section
4. Create new key
5. Copy and save securely

---

## 🌐 Custom Domain Setup

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain (e.g., `aspiro-ai.com`)
3. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

### Railway:
1. Go to Project Settings → Networking
2. Add custom domain
3. Configure DNS as shown in dashboard

### Render:
1. Go to Dashboard → Settings → Custom Domains
2. Add domain and configure DNS

---

## ⚡ Performance Optimization

### For Production:
1. **Environment Variables:**
   ```env
   OPENAI_API_KEY=your-key
   PORT=8000
   ENVIRONMENT=production
   ```

2. **Add to main.py:**
   ```python
   import os
   
   # Production optimizations
   if os.getenv("ENVIRONMENT") == "production":
       # Add logging
       import logging
       logging.basicConfig(level=logging.INFO)
       
       # Add monitoring
       @app.middleware("http")
       async def log_requests(request, call_next):
           start_time = time.time()
           response = await call_next(request)
           process_time = time.time() - start_time
           logger.info(f"{request.method} {request.url} - {response.status_code} - {process_time:.2f}s")
           return response
   ```

---

## 📊 Monitoring & Analytics

### Basic Health Monitoring:
```bash
# Check if your app is running
curl https://your-domain.com/health

# Expected response:
{"status": "healthy", "message": "Aspiro AI is running!"}
```

### Error Tracking:
1. **Sentry.io** - Free error tracking
2. **LogRocket** - Session replay
3. **New Relic** - Performance monitoring

---

## 🔒 Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform-specific secret management
   - Rotate API keys regularly

2. **HTTPS:**
   - All platforms provide automatic HTTPS
   - Ensure all external resources use HTTPS

3. **CORS:**
   - Update CORS settings for production domain
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-domain.com"],  # Update this
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

---

## 🐛 Troubleshooting

### Common Issues:

1. **API Key Not Working:**
   ```bash
   # Test API key locally
   curl -H "Authorization: Bearer your-api-key" \
        https://api.openai.com/v1/models
   ```

2. **Build Failures:**
   - Check Python version compatibility
   - Verify requirements.txt
   - Check platform-specific logs

3. **Runtime Errors:**
   - Check application logs
   - Verify environment variables
   - Test endpoints individually

### Debug Mode:
```python
# Add to main.py for debugging
import logging
logging.basicConfig(level=logging.DEBUG)

@app.middleware("http")
async def debug_requests(request, call_next):
    print(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"Response: {response.status_code}")
    return response
```

---

## 🎯 Recommended: Vercel Deployment

**Step-by-step for Vercel (recommended):**

1. **Prepare Repository:**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `pip install -r requirements.txt`

3. **Add Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add: `OPENAI_API_KEY` = `your-openai-api-key`

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your live URL!

**Your app will be live at:** `https://your-repo-name.vercel.app`

---

## 📈 Scaling Considerations

- **Free tiers** work for testing and small usage
- **Paid plans** needed for high traffic
- **Database** may be needed for user management
- **CDN** for static file optimization
- **Load balancing** for multiple instances

Happy deploying! 🚀 