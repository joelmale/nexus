import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { DatabaseService, createDatabaseService } from '../../server/database';
import { v4 as uuidv4 } from 'uuid';

describe('DatabaseService Integration Tests', () => {
  let dbService: DatabaseService;
  let pool: Pool;

  beforeAll(() => {
    if (!process.env.VITE_DATABASE_URL) {
      throw new Error('VITE_DATABASE_URL environment variable is not set');
    }

    dbService = createDatabaseService({ connectionString: process.env.VITE_DATABASE_URL });
    pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL });
  });

  afterAll(async () => {
    await dbService.close();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await pool.query('TRUNCATE TABLE connection_events, game_states, hosts, players, rooms RESTART IDENTITY');
  });

  it('should connect to the database and initialize the schema', async () => {
    await dbService.initialize();
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tableNames = result.rows.map(row => row.table_name);
    expect(tableNames).toContain('rooms');
    expect(tableNames).toContain('players');
    expect(tableNames).toContain('game_states');
    expect(tableNames).toContain('hosts');
  });

  describe('Room Operations', () => {
    const roomCode = 'TEST';
    const hostId = uuidv4();

    it('should create a new room and a primary host', async () => {
      await dbService.createRoom(roomCode, hostId);

      const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [roomCode]);
      expect(roomResult.rowCount).toBe(1);
      expect(roomResult.rows[0].primary_host_id).toBe(hostId);

      const hostResult = await pool.query('SELECT * FROM hosts WHERE room_code = $1 AND user_id = $2', [roomCode, hostId]);
      expect(hostResult.rowCount).toBe(1);
      expect(hostResult.rows[0].is_primary).toBe(true);
    });

    it('should get a room by code', async () => {
      await dbService.createRoom(roomCode, hostId);
      const room = await dbService.getRoom(roomCode);
      expect(room).not.toBeNull();
      expect(room?.code).toBe(roomCode);
    });

    it('should update a room status', async () => {
      await dbService.createRoom(roomCode, hostId);
      await dbService.updateRoomStatus(roomCode, 'hibernating');
      const room = await dbService.getRoom(roomCode);
      expect(room?.status).toBe('hibernating');
    });

    it('should update room host', async () => {
        const newHostId = uuidv4();
        await dbService.createRoom(roomCode, hostId);
        await dbService.addPlayer(newHostId, roomCode, 'New Host');
        await dbService.updateRoomHost(roomCode, newHostId);

        const room = await dbService.getRoom(roomCode);
        expect(room?.primary_host_id).toBe(newHostId);
    });
  });

  describe('Game State Operations', () => {
    const roomCode = 'GSTEST';
    const hostId = uuidv4();
    const gameState = { scenes: [{ id: 'scene1', name: 'Test Scene' }], activeSceneId: 'scene1' };

    beforeEach(async () => {
      await dbService.createRoom(roomCode, hostId);
    });

    it('should save a new game state', async () => {
      await dbService.saveGameState(roomCode, gameState);
      const result = await pool.query('SELECT * FROM game_states WHERE room_code = $1', [roomCode]);
      expect(result.rowCount).toBe(1);
      expect(result.rows[0].state_data).toEqual(gameState);
      expect(result.rows[0].version).toBe(1);
    });

    it('should load a game state', async () => {
      await dbService.saveGameState(roomCode, gameState);
      const loadedState = await dbService.loadGameState(roomCode);
      expect(loadedState).toEqual(gameState);
    });

    it('should update an existing game state and increment version', async () => {
        await dbService.saveGameState(roomCode, gameState);
        const updatedGameState = { ...gameState, activeSceneId: 'scene2' };
        await dbService.saveGameState(roomCode, updatedGameState);
        
        const result = await pool.query('SELECT * FROM game_states WHERE room_code = $1', [roomCode]);
        expect(result.rowCount).toBe(1);
        expect(result.rows[0].state_data).toEqual(updatedGameState);
        expect(result.rows[0].version).toBe(2);
    });
  });

  describe('Player and Host Operations', () => {
    const roomCode = 'PLYR';
    const hostId = uuidv4();
    const player1Id = uuidv4();

    beforeEach(async () => {
      await dbService.createRoom(roomCode, hostId);
      await dbService.addPlayer(hostId, roomCode, 'Host');
    });

    it('should add a player to a room', async () => {
      await dbService.addPlayer(player1Id, roomCode, 'Player 1');
      const players = await dbService.getRoomPlayers(roomCode);
      expect(players.length).toBe(2);
      expect(players.some(p => p.id === player1Id)).toBe(true);
    });

    it('should get connected players', async () => {
        await dbService.addPlayer(player1Id, roomCode, 'Player 1');
        let connectedPlayers = await dbService.getConnectedPlayers(roomCode);
        expect(connectedPlayers.length).toBe(2);

        await dbService.removePlayer(player1Id, roomCode);
        connectedPlayers = await dbService.getConnectedPlayers(roomCode);
        expect(connectedPlayers.length).toBe(1);
        expect(connectedPlayers[0].id).toBe(hostId);
    });

    it('should add and remove a co-host', async () => {
        await dbService.addPlayer(player1Id, roomCode, 'Player 1');
        await dbService.addCoHost(roomCode, player1Id, { canEditScenes: true });

        let hosts = await dbService.getRoomHosts(roomCode);
        expect(hosts.length).toBe(2);
        expect(hosts.some(h => h.user_id === player1Id && h.is_primary === false)).toBe(true);

        await dbService.removeCoHost(roomCode, player1Id);
        hosts = await dbService.getRoomHosts(roomCode);
        expect(hosts.length).toBe(1);
        expect(hosts.some(h => h.user_id === player1Id)).toBe(false);
    });
  });
});
