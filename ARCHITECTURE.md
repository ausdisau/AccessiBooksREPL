# AccessiBooks – System Architecture

## Overview

AccessiBooks is an audiobook player focused on accessibility. It includes library management, multiple content sources, an audio player with bookmarks and accessibility options (high contrast, dyslexia-friendly fonts, keyboard navigation).

Content is aggregated from:
- **iTunes Search API**: Audiobooks with preview audio
- **LibriVox**: Free public domain audiobooks
- **Open Library**: Book metadata
- **Google Books**: Search and discovery
- **External Library API**: Curated content
- **S3 / GCS**: Admin-uploaded audiobooks

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State**: React hooks, TanStack Query
- **Build**: Vite

### Backend
- **Runtime**: Node.js, Express
- **API**: REST (books, search, stream, auth, history, subscription)
- **Middleware**: CORS, JSON, logging

### Data
- **Database**: PostgreSQL (Drizzle ORM) – users, sessions, listening history, user preferences, books (S3/GCS metadata)
- **Session store**: PostgreSQL via connect-pg-simple
- **Client**: localStorage for preferences, bookmarks, progress

### Authentication
- **Stack**: Passport.js with express-session
- **Session**: PostgreSQL-backed (connect-pg-simple), 7-day TTL
- **Providers**: Local (email/password), Google, GitHub, Facebook, Microsoft, Auth0 (when configured)
- **Security**: httpOnly, sameSite, secure in production
- **Client**: useAuth hook, landing for guests

### Accessibility
- High contrast, dyslexia-friendly font, dark mode, reduced motion
- Keyboard shortcuts, ARIA, skip link, live regions

### Audio
- HTML5 audio, variable speed, skip, progress, bookmarks, sleep timer
- Progress: localStorage + API for logged-in users
- Chapters for LibriVox

### Storage (S3/GCS)
- Admin uploads: `server/storageAdapter.ts` (S3 and GCS)
- Stream: signed URLs via `/api/stream/:id`
- Admin UI: `/admin/storage` (list, upload, delete)

## External dependencies

- **DB**: @neondatabase/serverless, drizzle-orm
- **Auth**: passport, passport-local, passport-google-oauth20, passport-github2, passport-facebook, passport-microsoft, passport-auth0, bcryptjs, connect-pg-simple, express-session
- **API state**: @tanstack/react-query
- **UI**: Radix UI, Tailwind, class-variance-authority, lucide-react
- **Build**: Vite, TypeScript, esbuild
- **Payments**: Stripe
- **Storage**: @aws-sdk/client-s3, @google-cloud/storage, multer
