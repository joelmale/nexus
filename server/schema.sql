-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    "avatarUrl" TEXT,
    provider VARCHAR(50) NOT NULL, -- 'google', 'discord', 'guest'
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "dmId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenes JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Characters Table
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions Table (replaces 'rooms')
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY, -- Using UUIDs for session IDs
    "joinCode" VARCHAR(10) UNIQUE NOT NULL,
    "campaignId" UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    "primaryHostId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    "gameState" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "lastActivity" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT status_check CHECK (status IN ('active', 'hibernating', 'abandoned'))
);

-- Players Table (associates users with sessions)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "sessionId" UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    "characterId" UUID REFERENCES characters(id) ON DELETE SET NULL, -- Optional character link
    "isConnected" BOOLEAN DEFAULT TRUE,
    "lastSeen" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("userId", "sessionId")
);

-- Hosts Table (for Co-DM support)
CREATE TABLE IF NOT EXISTS hosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "sessionId" UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    permissions JSONB,
    "isPrimary" BOOLEAN DEFAULT FALSE,
    UNIQUE ("userId", "sessionId")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_dmId ON campaigns("dmId");
CREATE INDEX IF NOT EXISTS idx_characters_ownerId ON characters("ownerId");
CREATE INDEX IF NOT EXISTS idx_sessions_campaignId ON sessions("campaignId");
CREATE INDEX IF NOT EXISTS idx_sessions_primaryHostId ON sessions("primaryHostId");
CREATE INDEX IF NOT EXISTS idx_sessions_joinCode ON sessions("joinCode"); -- For quick lookup by room code
CREATE INDEX IF NOT EXISTS idx_players_userId ON players("userId");
CREATE INDEX IF NOT EXISTS idx_players_sessionId ON players("sessionId");
CREATE INDEX IF NOT EXISTS idx_players_characterId ON players("characterId");
CREATE INDEX IF NOT EXISTS idx_hosts_userId ON hosts("userId");
CREATE INDEX IF NOT EXISTS idx_hosts_sessionId ON hosts("sessionId");

-- Trigger function to update 'updatedAt' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
