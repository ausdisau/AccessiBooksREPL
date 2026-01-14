# replit.md

## Overview

AccessiBooks is a comprehensive audiobook player application designed with accessibility at its core. The application features a robust library management system for browsing audiobooks from multiple sources and a full-featured audio player with advanced playback controls, bookmarking capabilities, and accessibility features including high contrast mode, dyslexia-friendly fonts, and keyboard navigation support.

The platform aggregates content from multiple external APIs to provide users with access to thousands of free and commercial audiobooks and ebooks, including:
- **iTunes Search API**: 20 audiobooks with preview audio and commercial titles
- **LibriVox**: 30+ free public domain audiobooks
- **Open Library**: 20 books with comprehensive metadata
- **Google Books**: 20 books with enhanced search and discovery
- **External Library API**: Additional curated content

Total: **90+ books** from 5 integrated sources with parallel API fetching, intelligent caching, and comprehensive search across all sources.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and component-based architecture
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, accessible UI components
- **State Management**: React hooks for local state, TanStack Query for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints for book management including search, retrieval, and audio streaming
- **Middleware**: Express middleware for CORS, JSON parsing, and request logging

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Books table with comprehensive metadata (title, author, narrator, duration, cover images)
- **Local Storage**: Browser localStorage for user preferences, bookmarks, and playback progress
- **In-Memory Storage**: Fallback storage implementation with sample data for development

### Authentication and Authorization
- **System**: Replit Auth (OpenID Connect OAuth 2.0)
- **Providers**: Google, GitHub, Apple, X (Twitter), email/password
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple
- **Token Handling**: Automatic access token refresh using refresh tokens
- **User Storage**: PostgreSQL database with Drizzle ORM
- **Security**: sameSite cookies, httpOnly, secure in production, CSRF protection
- **Client Integration**: useAuth React hook, landing page for logged-out users

### Accessibility Features
- **Visual Accessibility**: High contrast mode, dyslexia-friendly font options, dark mode support
- **Keyboard Navigation**: Comprehensive keyboard shortcuts for all player functions (spacebar for play/pause, arrow keys for seeking)
- **Screen Reader Support**: Semantic HTML, ARIA labels, and proper focus management
- **Responsive Design**: Mobile-friendly interface with touch-optimized controls

### Audio Player System
- **Playback Engine**: HTML5 audio with custom React hooks for state management
- **Features**: Variable speed playback, skip forward/backward, progress tracking, bookmark system
- **Progress Persistence**: Automatic saving of playback position every 5 seconds (local storage + database for logged-in users)
- **Bookmark Management**: User-created bookmarks with custom names and timestamp navigation
- **Sleep Timer**: Configurable sleep timer (5, 15, 30, 45, 60 minutes) with countdown display
- **Chapter Navigation**: LibriVox books display chapter list with direct chapter selection

### Personalization Features
- **Continue Listening**: Shows in-progress books at top of library
- **For You Section**: Personalized recommendations based on listening history and genres
- **Genre Browsing**: Visual genre cards with accessible color schemes for filtering
- **Listening History**: Database-tracked history synced every 10 seconds for logged-in users

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon Database serverless driver for PostgreSQL connections
- **drizzle-orm**: Type-safe ORM for database operations with PostgreSQL dialect
- **@tanstack/react-query**: Data fetching and caching library for API state management

### UI and Styling
- **@radix-ui/react-***: Comprehensive set of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Utility for creating type-safe component variants

### Development and Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Type checking and compilation
- **esbuild**: Fast JavaScript bundler for production builds

### Audio and Media
- **HTML5 Audio API**: Native browser audio playback capabilities
- **Web Audio API**: For advanced audio processing features (available for future enhancements)

### Validation and Forms
- **zod**: Schema validation library for runtime type checking
- **@hookform/resolvers**: Form validation integration with React Hook Form
- **drizzle-zod**: Integration between Drizzle ORM and Zod for schema validation

## Multi-Source Content Integration

### LibriVox API Integration
- **Purpose**: Free public domain audiobooks
- **Endpoint**: https://librivox.org/api/feed/audiobooks
- **Content**: 30+ audiobooks including classics like "Count of Monte Cristo"
- **Features**: 
  - Full audiobook streaming with MP3 sections
  - Narrator information and descriptions
  - Genre and language metadata
  - Parallel search across title and author
- **Status**: ✅ Production-ready with security validation and caching

### Open Library API Integration
- **Purpose**: Comprehensive book metadata and professional covers
- **Endpoint**: https://openlibrary.org
- **Content**: 20 books with rich metadata
- **Features**:
  - High-quality cover images from covers.openlibrary.org
  - Subject/genre classification
  - Publication year and language metadata
  - ISBN and author information
- **Status**: ✅ Production-ready with HTTPS validation

### Google Books API Integration
- **Purpose**: Enhanced search and discovery with millions of books
- **Endpoint**: https://www.googleapis.com/books/v1
- **Content**: 20 books with detailed descriptions
- **Features**:
  - Full book descriptions (unlike Open Library basic search)
  - Categories and ratings metadata
  - Professional cover images
  - ISBN extraction and year parsing
- **API Key**: Required (stored in environment variable GOOGLE_BOOKS_API_KEY)
- **Status**: ✅ Production-ready with secure key management

### Content Aggregation Architecture
- **Parallel API Fetching**: All sources queried simultaneously using Promise.all()
- **Response Time**: ~6-10 seconds initial load, <5ms with caching
- **Caching Strategy**: 5-minute TTL in-memory cache for all aggregated results
- **Deduplication**: Title + Author matching to prevent duplicate books
- **Error Handling**: Graceful fallbacks if individual APIs fail
- **Security**: 
  - Domain whitelist for audio/image URLs (librivox.org, archive.org CDN pattern, covers.openlibrary.org, books.google.com)
  - SSRF protection via URL validation before redirects
  - Dynamic Internet Archive CDN pattern matching (/^ia\d+\.us\.archive\.org$/)

## Monetization System

### Subscription Tiers
- **Free Tier**: Ad-supported experience with full library access
- **Premium Tier ($9.99/month)**: Ad-free listening, unlimited bookmarks, priority support

### Stripe Integration
- **API Version**: 2025-12-15.clover (latest)
- **Checkout**: Stripe Checkout for secure payment processing
- **Subscription Management**: Cancel at period end, automatic renewal
- **Webhook Events**: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded
- **Security**: Webhook signature verification required in production
- **Environment Variables**: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET

### Advertising System
- **Ad Banner**: Displayed in library view for free users
- **Premium Upgrade Prompts**: Inline upgrade CTAs with feature highlights
- **Ad-Free Experience**: Premium users see no ads

### User Schema Extensions
- `subscriptionTier`: "free" or "premium"
- `stripeCustomerId`: Stripe customer reference
- `stripeSubscriptionId`: Active subscription reference
- `subscriptionEndDate`: Subscription expiration date

### Frontend Components
- **AdBanner**: Conditional display based on subscription status
- **SubscriptionCard**: Full subscription management UI
- **PremiumBadge**: Visual indicator for premium status
- **useSubscription hook**: React hook for subscription state management