import { type Book, type InsertBook, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

const EXTERNAL_API_BASE = "https://library-management-api-i6if.onrender.com/api";

export interface IStorage {
  getBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  searchBooks(query: string): Promise<Book[]>;
  
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  authenticateExternalUser(username: string, password: string): Promise<User | null>;
  sessionStore: session.Store;
}

interface ExternalBook {
  _id: string;
  title: string;
  author: string;
  isbn?: string;
  publishedYear?: number;
  genre?: string;
  description?: string;
  coverImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ExternalUser {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Transform external user data to our format
function transformExternalUser(externalUser: ExternalUser, isLocalUser = false, hashedPassword?: string): User {
  return {
    id: externalUser._id,
    username: externalUser.username,
    email: externalUser.email,
    password: hashedPassword || (isLocalUser ? '' : 'EXTERNAL_USER'), // Mark external users specially
    firstName: externalUser.firstName || null,
    lastName: externalUser.lastName || null,
    profilePicture: externalUser.profilePicture || null,
    createdAt: externalUser.createdAt ? new Date(externalUser.createdAt) : new Date(),
    updatedAt: externalUser.updatedAt ? new Date(externalUser.updatedAt) : new Date(),
  };
}

// Function to transform external API data to our format
function transformExternalBook(externalBook: ExternalBook): Book {
  return {
    id: externalBook._id,
    title: externalBook.title,
    author: externalBook.author,
    narrator: null, // External API doesn't have narrator
    description: externalBook.description || null,
    duration: Math.floor(Math.random() * 30000) + 18000, // Random duration between 5-13 hours
    coverImage: externalBook.coverImage || null,
    audioUrl: `${EXTERNAL_API_BASE}/stream/${externalBook._id}`, // Mock audio URL
    genre: externalBook.genre || null,
    publishedYear: externalBook.publishedYear || null,
  };
}

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export class ExternalAPIStorage implements IStorage {
  private fallbackBooks: Map<string, Book>;
  private localUsers: Map<string, User>; // For session management
  public sessionStore: session.Store;

  constructor() {
    this.fallbackBooks = new Map();
    this.localUsers = new Map();
    this.initializeFallbackData();
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  private initializeFallbackData() {
    const sampleBooks: Omit<Book, 'id'>[] = [
      {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        narrator: "Jake Gyllenhaal",
        description: "The Great Gatsby, F. Scott Fitzgerald's third book, stands as the supreme achievement of his career. This exemplary novel of the Jazz Age has been acclaimed by generations of readers.",
        duration: 19992, // 5h 33m 12s
        coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", // Sample audio for demo
        genre: "Classic Literature",
        publishedYear: 1925,
      },
      {
        title: "Dune",
        author: "Frank Herbert",
        narrator: "Scott Brick",
        description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world.",
        duration: 75720, // 21h 2m
        coverImage: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        genre: "Science Fiction",
        publishedYear: 1965,
      },
      {
        title: "The Girl with the Dragon Tattoo",
        author: "Stieg Larsson",
        narrator: "Simon Vance",
        description: "Harriet Vanger, a scion of one of Sweden's wealthiest families disappeared over forty years ago. All these years later, her aged uncle continues to seek the truth.",
        duration: 65640, // 18h 14m
        coverImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        genre: "Mystery/Thriller",
        publishedYear: 2005,
      },
      {
        title: "Atomic Habits",
        author: "James Clear",
        narrator: "James Clear",
        description: "No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear reveals practical strategies that will teach you exactly how to form good habits.",
        duration: 20100, // 5h 35m
        coverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        genre: "Self-Help",
        publishedYear: 2018,
      },
      {
        title: "The Book Thief",
        author: "Markus Zusak",
        narrator: "Allan Corduner",
        description: "It is 1939. Nazi Germany. The country is holding its breath. Death has never been busier, and will become busier still.",
        duration: 50160, // 13h 56m
        coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        genre: "Historical Fiction",
        publishedYear: 2005,
      },
      {
        title: "Where the Crawdads Sing",
        author: "Delia Owens",
        narrator: "Cassandra Campbell",
        description: "For years, rumors of the 'Marsh Girl' have haunted Barkley Cove, a quiet town on the North Carolina coast.",
        duration: 43920, // 12h 12m
        coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        genre: "Fiction",
        publishedYear: 2018,
      },
    ];

    sampleBooks.forEach(book => {
      const id = randomUUID();
      this.fallbackBooks.set(id, { ...book, id });
    });
  }

  async getBooks(): Promise<Book[]> {
    try {
      console.log('Fetching books from external API...');
      const response = await fetchWithTimeout(`${EXTERNAL_API_BASE}/books`);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('External API response:', JSON.stringify(responseData, null, 2));
        
        // Handle different response formats
        let externalBooks: ExternalBook[];
        if (Array.isArray(responseData)) {
          externalBooks = responseData;
        } else if (responseData.books && Array.isArray(responseData.books)) {
          externalBooks = responseData.books;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          externalBooks = responseData.data;
        } else {
          console.warn('Unexpected response format from external API:', responseData);
          return Array.from(this.fallbackBooks.values());
        }
        
        console.log(`Fetched ${externalBooks.length} books from external API`);
        return externalBooks.map(transformExternalBook);
      } else {
        console.warn('External API returned error, using fallback data');
        return Array.from(this.fallbackBooks.values());
      }
    } catch (error) {
      console.warn('Failed to fetch from external API, using fallback data:', error);
      return Array.from(this.fallbackBooks.values());
    }
  }

  async getBook(id: string): Promise<Book | undefined> {
    try {
      console.log(`Fetching book ${id} from external API...`);
      const response = await fetchWithTimeout(`${EXTERNAL_API_BASE}/books/${id}`);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log(`External API book response for ${id}:`, JSON.stringify(responseData, null, 2));
        
        // Handle different response formats  
        let externalBook: ExternalBook;
        if (responseData._id || responseData.id) {
          externalBook = responseData;
        } else if (responseData.book) {
          externalBook = responseData.book;
        } else if (responseData.data) {
          externalBook = responseData.data;
        } else {
          console.warn('Unexpected book response format from external API:', responseData);
          return this.fallbackBooks.get(id);
        }
        
        console.log(`Fetched book ${id} from external API`);
        return transformExternalBook(externalBook);
      } else {
        console.warn(`External API returned error for book ${id}, using fallback data`);
        return this.fallbackBooks.get(id);
      }
    } catch (error) {
      console.warn(`Failed to fetch book ${id} from external API, using fallback data:`, error);
      return this.fallbackBooks.get(id);
    }
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    // For now, we'll add to fallback storage since external API might require authentication
    const id = randomUUID();
    const book: Book = { 
      ...insertBook, 
      id,
      narrator: insertBook.narrator ?? null,
      description: insertBook.description ?? null,
      coverImage: insertBook.coverImage ?? null,
      genre: insertBook.genre ?? null,
      publishedYear: insertBook.publishedYear ?? null,
    };
    this.fallbackBooks.set(id, book);
    return book;
  }

  async searchBooks(query: string): Promise<Book[]> {
    try {
      // First try to get all books from external API, then filter
      const books = await this.getBooks();
      const lowercaseQuery = query.toLowerCase();
      
      return books.filter(book => 
        book.title.toLowerCase().includes(lowercaseQuery) ||
        book.author.toLowerCase().includes(lowercaseQuery) ||
        (book.genre && book.genre.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      console.warn('Failed to search external API, using fallback data:', error);
      const books = Array.from(this.fallbackBooks.values());
      const lowercaseQuery = query.toLowerCase();
      
      return books.filter(book => 
        book.title.toLowerCase().includes(lowercaseQuery) ||
        book.author.toLowerCase().includes(lowercaseQuery) ||
        (book.genre && book.genre.toLowerCase().includes(lowercaseQuery))
      );
    }
  }

  // User management methods integrating with external API
  async getUser(id: string): Promise<User | undefined> {
    try {
      console.log(`Fetching user ${id} from external API...`);
      const response = await fetchWithTimeout(`${EXTERNAL_API_BASE}/users/${id}`);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log(`External API user response for ${id}:`, JSON.stringify(responseData, null, 2));
        
        let externalUser: ExternalUser;
        if (responseData._id || responseData.id) {
          externalUser = responseData;
        } else if (responseData.user) {
          externalUser = responseData.user;
        } else if (responseData.data) {
          externalUser = responseData.data;
        } else {
          console.warn('Unexpected user response format from external API:', responseData);
          return this.localUsers.get(id);
        }
        
        const user = transformExternalUser(externalUser);
        this.localUsers.set(id, user); // Cache locally for session management
        return user;
      } else {
        console.warn(`External API returned error for user ${id}, checking local cache`);
        return this.localUsers.get(id);
      }
    } catch (error) {
      console.warn(`Failed to fetch user ${id} from external API, checking local cache:`, error);
      return this.localUsers.get(id);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Check local cache first for session management
    const localUser = Array.from(this.localUsers.values()).find(user => user.username === username);
    if (localUser) {
      console.log(`Found user ${username} in local cache`);
      return localUser;
    }

    try {
      console.log(`Searching for user ${username} from external API...`);
      const response = await fetchWithTimeout(`${EXTERNAL_API_BASE}/users`);
      
      if (response.ok) {
        const responseData = await response.json();
        let externalUsers: ExternalUser[];
        
        if (Array.isArray(responseData)) {
          externalUsers = responseData;
        } else if (responseData.users && Array.isArray(responseData.users)) {
          externalUsers = responseData.users;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          externalUsers = responseData.data;
        } else {
          console.warn('Unexpected users response format from external API:', responseData);
          return undefined;
        }
        
        const externalUser = externalUsers.find(user => user.username === username);
        if (externalUser) {
          const user = transformExternalUser(externalUser);
          this.localUsers.set(user.id, user);
          return user;
        }
      }
    } catch (error) {
      console.warn(`Failed to search for user ${username} from external API:`, error);
    }
    
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Check local cache first
    const localUser = Array.from(this.localUsers.values()).find(user => user.email === email);
    if (localUser) {
      return localUser;
    }

    try {
      const response = await fetchWithTimeout(`${EXTERNAL_API_BASE}/users`);
      
      if (response.ok) {
        const responseData = await response.json();
        let externalUsers: ExternalUser[];
        
        if (Array.isArray(responseData)) {
          externalUsers = responseData;
        } else if (responseData.users && Array.isArray(responseData.users)) {
          externalUsers = responseData.users;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          externalUsers = responseData.data;
        } else {
          return undefined;
        }
        
        const externalUser = externalUsers.find(user => user.email === email);
        if (externalUser) {
          const user = transformExternalUser(externalUser);
          this.localUsers.set(user.id, user);
          return user;
        }
      }
    } catch (error) {
      console.warn(`Failed to search for user by email ${email}:`, error);
    }
    
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log('Creating user via external API...', { username: insertUser.username, email: insertUser.email });
      
      const payload = {
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        firstName: insertUser.firstName,
        lastName: insertUser.lastName
      };
      
      const response = await fetch(`${EXTERNAL_API_BASE}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('User created successfully via external API:', responseData);
        
        let externalUser: ExternalUser;
        if (responseData._id || responseData.id) {
          externalUser = responseData;
        } else if (responseData.user) {
          externalUser = responseData.user;
        } else if (responseData.data) {
          externalUser = responseData.data;
        } else {
          throw new Error('Unexpected registration response format');
        }
        
        const user = transformExternalUser(externalUser, false); // External user, no password stored
        this.localUsers.set(user.id, user);
        return user;
      } else {
        const errorText = await response.text();
        throw new Error(`Registration failed: ${errorText}`);
      }
    } catch (error) {
      console.warn('Failed to create user via external API, creating locally:', error);
      
      // Fallback to local creation
      const id = randomUUID();
      const user: User = {
        id,
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        firstName: insertUser.firstName || null,
        lastName: insertUser.lastName || null,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.localUsers.set(id, user);
      return user;
    }
  }
  
  async authenticateExternalUser(username: string, password: string): Promise<User | null> {
    try {
      console.log(`Attempting external authentication for: ${username}`);
      
      const payload = {
        username,
        password,
      };
      
      const response = await fetch(`${EXTERNAL_API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('External authentication successful:', { username });
        
        let externalUser: ExternalUser;
        if (responseData._id || responseData.id) {
          externalUser = responseData;
        } else if (responseData.user) {
          externalUser = responseData.user;
        } else if (responseData.data) {
          externalUser = responseData.data;
        } else {
          console.warn('Unexpected external login response format:', responseData);
          return null;
        }
        
        const user = transformExternalUser(externalUser, false); // External user
        this.localUsers.set(user.id, user);
        return user;
      } else {
        console.log(`External authentication failed for ${username}`);
        return null;
      }
    } catch (error) {
      console.warn(`External authentication error for ${username}:`, error);
      return null;
    }
  }
}

export const storage = new ExternalAPIStorage();
