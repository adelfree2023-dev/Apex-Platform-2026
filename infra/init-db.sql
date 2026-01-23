-- Apex Platform Database Initialization
-- This script runs on first PostgreSQL startup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create the public schema tables will be created by Prisma migrations
-- This file ensures the database is ready for Prisma

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'Apex Platform database initialized successfully';
END $$;
