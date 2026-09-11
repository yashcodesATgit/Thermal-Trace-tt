import dotenv from 'dotenv';
dotenv.config(); // Load actual .env file for testing

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/thermaldb';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
process.env.PORT = process.env.PORT || '8080';
