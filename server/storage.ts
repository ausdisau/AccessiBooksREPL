import { type Book, type InsertBook } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  searchBooks(query: string): Promise<Book[]>;
}

export class MemStorage implements IStorage {
  private books: Map<string, Book>;

  constructor() {
    this.books = new Map();
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleBooks: InsertBook[] = [
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
      this.books.set(id, { ...book, id });
    });
  }

  async getBooks(): Promise<Book[]> {
    return Array.from(this.books.values());
  }

  async getBook(id: string): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = randomUUID();
    const book: Book = { ...insertBook, id };
    this.books.set(id, book);
    return book;
  }

  async searchBooks(query: string): Promise<Book[]> {
    const books = Array.from(this.books.values());
    const lowercaseQuery = query.toLowerCase();
    
    return books.filter(book => 
      book.title.toLowerCase().includes(lowercaseQuery) ||
      book.author.toLowerCase().includes(lowercaseQuery) ||
      (book.genre && book.genre.toLowerCase().includes(lowercaseQuery))
    );
  }
}

export const storage = new MemStorage();
