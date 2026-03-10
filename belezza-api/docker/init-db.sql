-- Belezza API - Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE belezza_dev TO belezza;

-- Set timezone
SET timezone = 'America/Sao_Paulo';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Belezza database initialized successfully';
END $$;
