# replit.md

## Overview

AccessiBooks is a comprehensive audiobook player application designed with accessibility at its core. The application features a robust library management system for browsing audiobooks and a full-featured audio player with advanced playback controls, bookmarking capabilities, and accessibility features including high contrast mode, dyslexia-friendly fonts, and keyboard navigation support.

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