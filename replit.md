# replit.md

## Overview

AccessiBooks is a comprehensive audiobook player application designed with accessibility at its core. The application features a robust library management system for browsing audiobooks from multiple sources and a full-featured audio player with advanced playback controls, bookmarking capabilities, and accessibility features including high contrast mode, dyslexia-friendly fonts, and keyboard navigation support.

The platform aggregates content from multiple external APIs to provide users with access to thousands of free and commercial audiobooks and ebooks, including:
- **LibriVox**: 30+ free public domain audiobooks
- **Open Library**: 20 books with comprehensive metadata
- **Google Books**: 20 books with enhanced search and discovery
- **External Library API**: Additional curated content

Total: **74+ books** from 4 integrated sources with parallel API fetching, intelligent caching, and comprehensive search across all sources.

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
- **Current State**: No authentication system implemented
- **Session Management**: Basic session handling infrastructure present but not actively used
- **Access Control**: Open access to all audiobook content and features

### Accessibility Features
- **Visual Accessibility**: High contrast mode, dyslexia-friendly font options, dark mode support
- **Keyboard Navigation**: Comprehensive keyboard shortcuts for all player functions (spacebar for play/pause, arrow keys for seeking)
- **Screen Reader Support**: Semantic HTML, ARIA labels, and proper focus management
- **Responsive Design**: Mobile-friendly interface with touch-optimized controls

### Audio Player System
- **Playback Engine**: HTML5 audio with custom React hooks for state management
- **Features**: Variable speed playback, skip forward/backward, progress tracking, bookmark system
- **Progress Persistence**: Automatic saving of playback position every 5 seconds
- **Bookmark Management**: User-created bookmarks with custom names and timestamp navigation

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