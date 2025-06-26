# Google OAuth Setup Guide for Aspiro AI

## Overview
This guide explains how to set up Google OAuth authentication for the Aspiro AI platform.

## Prerequisites
- Google Cloud Console account
- Aspiro AI platform deployed and accessible

## Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (for user profile information)

## Step 2: Configure OAuth Consent Screen
1. Go to APIs & Services > OAuth consent screen
2. Choose "External" user type
3. Fill in the required information:
   - App name: Aspiro AI
   - User support email: your email
   - Developer contact information: your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if needed

## Step 3: Create OAuth Credentials
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:8000` (for development)
   - `https://yourdomain.com` (for production)
5. Add authorized redirect URIs:
   - `http://localhost:8000/login-page` (for development)
   - `https://yourdomain.com/login-page` (for production)

## Step 4: Configure Environment Variables
1. Copy your Client ID from the credentials page
2. Add to your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_actual_google_client_id_here
   ```

## Step 5: Update Frontend Configuration
1. Open `static/login.html`
2. Replace the Google OAuth initialization code:
   ```javascript
   // Replace this section in both login.html and register.html
   google.accounts.id.initialize({
       client_id: "YOUR_ACTUAL_GOOGLE_CLIENT_ID", // Replace with your actual Client ID
       callback: handleGoogleLogin
   });
   ```

## Step 6: Test the Integration
1. Restart your server
2. Go to the login page
3. Click "Google bilan kirish" button
4. Complete the OAuth flow
5. Verify user is created/logged in successfully

## Security Notes
- Never commit your Google Client ID to public repositories
- Use environment variables for all sensitive configuration
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Cloud Console

## Troubleshooting
- **"Google OAuth not configured"**: Check that GOOGLE_CLIENT_ID is set in environment
- **"Invalid token"**: Verify your Client ID matches the one in Google Cloud Console
- **"Unauthorized origin"**: Add your domain to authorized JavaScript origins
- **"Redirect URI mismatch"**: Ensure redirect URIs match exactly in Google Cloud Console

## Current Status
- ✅ Backend OAuth endpoint implemented (`/auth/google`)
- ✅ Frontend Google login buttons added
- ✅ Database integration for Google users
- ⚠️ Requires Google Cloud Console configuration
- ⚠️ Requires environment variable setup 