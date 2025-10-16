-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms/Sessions table
CREATE TABLE rooms (
  code VARCHAR(4) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  primary_host_id UUID NOT NULL,
  CONSTRAINT status_check CHECK (status IN ('active', 'hibernating', 'abandoned'))
);

-- Hosts table (for co-host support)
CREATE TABLE hosts (
  room_code VARCHAR(4) REFERENCES rooms(code) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_primary BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_code, user_id)
);

-- Game state storage (with JSONB for efficient querying)
CREATE TABLE game_states (
  room_code VARCHAR(4) PRIMARY KEY REFERENCES rooms(code) ON DELETE CASCADE,
  state_data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID NOT NULL,
  room_code VARCHAR(4) REFERENCES rooms(code) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  connected BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, room_code)
);

-- Connection events log (for debugging/analytics)
CREATE TABLE connection_events (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(4) REFERENCES rooms(code) ON DELETE CASCADE,
  user_id UUID,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_last_activity ON rooms(last_activity);
CREATE INDEX idx_rooms_created_at ON rooms(created_at);
CREATE INDEX idx_players_room ON players(room_code);
CREATE INDEX idx_players_connected ON players(connected);
CREATE INDEX idx_connection_events_room ON connection_events(room_code);
CREATE INDEX idx_connection_events_timestamp ON connection_events(timestamp);
CREATE INDEX idx_game_states_updated_at ON game_states(updated_at);

-- Function to update last_activity automatically
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms SET last_activity = NOW() WHERE code = NEW.room_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update room activity
CREATE TRIGGER update_room_activity_on_game_state
AFTER INSERT OR UPDATE ON game_states
FOR EACH ROW EXECUTE FUNCTION update_room_activity();

-- Function to clean up old abandoned rooms
CREATE OR REPLACE FUNCTION cleanup_old_rooms(hours_old INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rooms
  WHERE status = 'abandoned'
    AND last_activity < NOW() - (hours_old || ' hours')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for room statistics
CREATE VIEW room_stats AS
SELECT
  status,
  COUNT(*) as room_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds,
  SUM((SELECT COUNT(*) FROM players p WHERE p.room_code = r.code AND p.connected = true)) as total_players
FROM rooms r
GROUP BY status;