-- Weekly Report Application - PostgreSQL Schema
-- Run this script to create all necessary tables for production deployment

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    department VARCHAR(255)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    team_id VARCHAR(64) REFERENCES teams(id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    team_id VARCHAR(64) REFERENCES teams(id),
    app_name VARCHAR(255) NOT NULL,
    category VARCHAR(255) DEFAULT '',
    severity VARCHAR(50) NOT NULL,
    importance INTEGER DEFAULT 1,
    content TEXT,
    week INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    team_id VARCHAR(64) REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    items TEXT DEFAULT '[]',
    share_token VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_team_id ON reports(team_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_week_year ON reports(week, year);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_share_token ON templates(share_token);
