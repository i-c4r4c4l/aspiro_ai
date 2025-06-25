# 🔧 Port Conflict Fix Guide

## Problem: Errno 10048 - Port Already in Use

**Error Message:**
```
[Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000): 
[winerror 10048] only one usage of each socket address is normally permitted
```

## ❌ **NOT Related to Vercel Deployment**
This is a **local development issue**, not a Vercel problem. Vercel handles its own port management in the cloud.

## 🔍 **Root Cause**
Port 8000 is already occupied by:
- Previous server session still running
- Another application using the same port
- Background Python process not properly terminated

## ✅ **Solution Steps**

### **Step 1: Check What's Using Port 8000**
```powershell
netstat -ano | findstr :8000
```

### **Step 2: Find Python Processes**
```powershell
Get-Process python*
# OR
tasklist /fi "imagename eq python.exe"
```

### **Step 3: Kill the Conflicting Process**
```powershell
taskkill /PID [PROCESS_ID] /F
```

### **Step 4: Restart Your Server**
```powershell
python main.py
```

## 🛠️ **Alternative Solutions**

### **Option 1: Use Different Port**
Modify your `main.py`:
```python
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))  # Changed from 8000 to 8001
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### **Option 2: Environment Variable**
```powershell
$env:PORT = "8001"
python main.py
```

### **Option 3: Direct Port Specification**
```powershell
python -c "import uvicorn; from main import app; uvicorn.run(app, host='0.0.0.0', port=8001)"
```

## 🚀 **Vercel Deployment**
For Vercel deployment, this issue **won't occur** because:
- Vercel automatically assigns ports
- No local port conflicts in cloud environment
- Your `vercel.json` configuration handles routing

## 🔄 **Prevention Tips**

### **Proper Server Shutdown:**
- Use `Ctrl+C` to stop the server properly
- Don't close terminal windows while server is running
- Check for background processes before restarting

### **Development Workflow:**
```powershell
# 1. Check if server is running
Get-Process python*

# 2. Kill if needed
taskkill /PID [ID] /F

# 3. Start fresh
python main.py
```

## ✅ **Status: FIXED**
Your server should now be running properly on port 8000 without conflicts! 