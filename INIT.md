# AccessiBooks Initialization Guide

## Prerequisites

1. **Node.js** (v20 or later recommended)
2. **PostgreSQL Database** (or Neon Database connection string)
3. **npm** (comes with Node.js)

## Initialization Steps

### 1. Install Dependencies

```bash
npm install
```

**Note:** If you encounter disk space issues on Windows, you may need to:
- Free up space on C: drive, OR
- Configure npm to use a different cache location:
  ```bash
  npm config set cache "D:\npm-cache" --global
  ```

### 2. Set Up Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=generate-a-random-secret-key-here

# Optional
PORT=5000
```

**Generate SESSION_SECRET:**
```bash
# On Unix/Mac:
openssl rand -base64 32

# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 3. Set Up Database

The application uses Drizzle ORM with PostgreSQL. Make sure your database is running and accessible via `DATABASE_URL`.

To push the schema to the database:
```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or the port specified in PORT).

## Environment Variables Reference

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption

### Optional Variables

- `PORT` - Server port (default: 5000)
- `SPOTIFY_ACCESS_TOKEN` - Spotify API access token
- `SPOTIFY_REFRESH_TOKEN` - Spotify API refresh token
- `SPOTIFY_CLIENT_ID` - Spotify API client ID
- `FACEBOOK_APP_ID` - Facebook OAuth app ID
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID
- `AUTH0_DOMAIN` - Auth0 domain
- `ALLOWED_ORIGIN` - CORS allowed origin

## Application Structure

- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Shared TypeScript schemas
- `dist/` - Production build output (generated)

## Features

✅ Public catalog browsing (landing page)
✅ Subject/genre filtering
✅ Trending, New Arrivals, Disability Voices sections
✅ User authentication (local, Facebook, Microsoft, Auth0)
✅ Audiobook player with accessibility features
✅ Bookmarking and progress tracking
✅ High contrast mode and dyslexia-friendly fonts

## Troubleshooting

### Disk Space Issues

If npm install fails due to disk space:
1. Free up space on C: drive
2. Or set npm cache to D: drive:
   ```bash
   npm config set cache "D:\npm-cache" --global
   ```

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network/firewall settings

### Port Already in Use

- Change `PORT` in `.env` file
- Or stop the process using port 5000
