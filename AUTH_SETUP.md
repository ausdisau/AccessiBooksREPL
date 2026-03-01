# Authentication System Setup Guide

## Overview
This project uses **Passport.js** for authentication with express-session and a PostgreSQL session store. The system supports multiple authentication providers:

- **Local Authentication** (Email/Password)
- **Facebook OAuth**
- **Microsoft OAuth**
- **Auth0 OAuth**
- **Google OAuth** (New)
- **GitHub OAuth** (New)

## Installed Packages

### Core Authentication
- `passport` - Authentication middleware
- `passport-local` - Local username/password authentication
- `express-session` - Session management
- `connect-pg-simple` - PostgreSQL session store
- `bcryptjs` - Password hashing

### OAuth Providers
- `passport-facebook` - Facebook OAuth
- `passport-microsoft` - Microsoft OAuth
- `passport-auth0` - Auth0 OAuth
- `passport-google-oauth20` - Google OAuth (New)
- `passport-github2` - GitHub OAuth (New)

### Payment Integration
- `stripe` - Stripe payment processing (for subscriptions)

## Environment Variables Required

Add these to your `.env` file:

```env
# Session Management
SESSION_SECRET=your-secret-key-here-min-32-characters

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Local Auth (always available)
# No additional config needed

# Facebook OAuth (optional)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Microsoft OAuth (optional)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Auth0 OAuth (optional)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Stripe (for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Setting Up OAuth Providers

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback` (or your production URL)
7. Copy Client ID and Client Secret to `.env`

### GitHub OAuth Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000` (or your production URL)
   - Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Set Valid OAuth Redirect URIs: `http://localhost:3000/api/auth/facebook/callback`
5. Copy App ID and App Secret to `.env`

### Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Create new registration
4. Set redirect URI: `http://localhost:3000/api/auth/microsoft/callback`
5. Copy Application (client) ID and create a client secret
6. Add to `.env`

### Auth0 Setup

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application (Regular Web Application)
3. Set Allowed Callback URLs: `http://localhost:3000/api/auth/auth0/callback`
4. Copy Domain, Client ID, and Client Secret to `.env`

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register new user (local)
- `POST /api/auth/login` - Login (local)
- `GET /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current user
- `GET /api/auth/providers` - Get available auth providers

### OAuth Endpoints

- `GET /api/auth/facebook` - Initiate Facebook OAuth
- `GET /api/auth/facebook/callback` - Facebook OAuth callback
- `GET /api/auth/microsoft` - Initiate Microsoft OAuth
- `GET /api/auth/microsoft/callback` - Microsoft OAuth callback
- `GET /api/auth/auth0` - Initiate Auth0 OAuth
- `GET /api/auth/auth0/callback` - Auth0 OAuth callback
- `GET /api/auth/google` - Initiate Google OAuth (New)
- `GET /api/auth/google/callback` - Google OAuth callback (New)
- `GET /api/auth/github` - Initiate GitHub OAuth (New)
- `GET /api/auth/github/callback` - GitHub OAuth callback (New)

## How It Works

1. **Session Management**: Uses PostgreSQL-backed sessions via `connect-pg-simple`
2. **User Storage**: Users stored in PostgreSQL database with Drizzle ORM
3. **Password Security**: Passwords hashed with bcrypt (10 rounds)
4. **OAuth Flow**: Standard OAuth 2.0 flow with Passport strategies
5. **User Merging**: OAuth users automatically created/updated in database

## Security Features

- ✅ Secure session cookies (httpOnly, secure in production)
- ✅ CSRF protection (sameSite: lax)
- ✅ Password hashing with bcrypt
- ✅ Session expiration (7 days)
- ✅ PostgreSQL-backed session storage
- ✅ Environment-based configuration

## Current auth stack

- Passport.js with express-session and connect-pg-simple
- Multiple OAuth providers (Google, GitHub, Facebook, Microsoft, Auth0) plus local email/password
- PostgreSQL-backed sessions (7-day TTL)
- No platform-specific auth; runs on any Node.js host

## Next Steps

1. **Install Dependencies**: Run `npm install` (when disk space is available)
2. **Configure Environment**: Set up `.env` file with required variables
3. **Set Up OAuth Apps**: Configure OAuth providers you want to use
4. **Test Authentication**: Test each authentication method
5. **Deploy**: Update callback URLs for production environment

## Troubleshooting

### "Cannot find module" errors
- Run `npm install` to install all dependencies
- Ensure all Passport strategy packages are installed

### OAuth callbacks failing
- Verify callback URLs match exactly in OAuth provider settings
- Check that environment variables are set correctly
- Ensure HTTPS is used in production

### Session not persisting
- Verify `SESSION_SECRET` is set and is at least 32 characters
- Check database connection for session store
- Verify `DATABASE_URL` is correct

### Users not being created
- Check database connection
- Verify user schema matches expected format
- Check server logs for errors
