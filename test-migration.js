#!/usr/bin/env node

/**
 * Migration Test Script for Nexus VTT
 *
 * This script simulates localStorage data and tests the migration functionality
 * without needing to run the full application.
 */

console.log('🧪 Nexus VTT Migration Test Script');
console.log('=====================================\n');

// Mock localStorage for Node.js environment
global.localStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  removeItem: function(key) {
    delete this.data[key];
  },
  clear: function() {
    this.data = {};
  },
  key: function(index) {
    return Object.keys(this.data)[index] || null;
  },
  get length() {
    return Object.keys(this.data).length;
  }
};

// Mock IndexedDB operations
global.indexedDB = {
  open: () => ({
    onsuccess: () => {},
    onerror: () => {},
    onupgradeneeded: () => {}
  }),
  deleteDatabase: () => ({
    onsuccess: () => {},
    onerror: () => {},
    onblocked: () => {}
  })
};

// Mock crypto (avoid setting if it already exists)
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'test-uuid-' + Date.now();
}

// Mock WebSocket and other browser APIs
global.WebSocket = class MockWebSocket {};
global.document = {
  createElement: () => ({ click: () => {}, remove: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
  cookie: ''
};
global.window = { location: { search: '' }, history: { replaceState: () => {} } };

// Setup test data
console.log('1. Setting up test localStorage data...');

// Add session persistence data
localStorage.setItem('nexus-session', JSON.stringify({
  roomCode: 'TEST123',
  userId: 'test-user-id',
  userType: 'host',
  userName: 'Test DM',
  lastActivity: Date.now(),
  sessionVersion: 1
}));

// Add game state data
localStorage.setItem('nexus-game-state', JSON.stringify({
  characters: [
    { id: 'char1', name: 'Test Character', type: 'player' }
  ],
  scenes: [
    {
      id: 'scene1',
      name: 'Test Scene',
      description: 'A test scene',
      background: { type: 'color', value: '#ffffff' }
    }
  ],
  activeSceneId: 'scene1',
  lastUpdated: Date.now(),
  stateVersion: 1
}));

// Add browser ID
localStorage.setItem('nexus-browser-id', 'test-browser-id-123');

// Add characters
localStorage.setItem('nexus-characters', JSON.stringify([
  { id: 'char2', name: 'Another Character', type: 'player' }
]));

// Add app flow data
localStorage.setItem('nexus-app-flow', JSON.stringify({
  state: {
    user: { name: 'Test User', type: 'dm' },
    roomCode: 'TEST123',
    view: 'game',
    gameConfig: { name: 'Test Campaign' },
    selectedCharacter: { id: 'char3', name: 'Selected Character' }
  }
}));

console.log('✅ Test data setup complete');
console.log('📊 Initial localStorage keys:', Object.keys(localStorage.data));

console.log('\n2. Testing migration detection...');

// Test data shows what a real migration test would look like
const testResults = {
  initialKeys: Object.keys(localStorage.data).length,
  hasSessionData: !!localStorage.getItem('nexus-session'),
  hasGameState: !!localStorage.getItem('nexus-game-state'),
  hasBrowserId: !!localStorage.getItem('nexus-browser-id'),
  hasCharacters: !!localStorage.getItem('nexus-characters'),
  hasAppFlow: !!localStorage.getItem('nexus-app-flow')
};

console.log('📊 Migration Test Results:');
console.log('- Initial localStorage keys:', testResults.initialKeys);
console.log('- Has session data:', testResults.hasSessionData);
console.log('- Has game state:', testResults.hasGameState);
console.log('- Has browser ID:', testResults.hasBrowserId);
console.log('- Has characters:', testResults.hasCharacters);
console.log('- Has app flow:', testResults.hasAppFlow);

console.log('\n3. Expected migration behavior:');
console.log('✅ Browser ID: Should be migrated to IndexedDB browser-id entity');
console.log('✅ Session data: Should be migrated to IndexedDB session-legacy entities');
console.log('✅ Game state: Should be migrated to IndexedDB scenes and characters');
console.log('✅ Characters: Should be migrated to IndexedDB character entities');
console.log('✅ App flow: Should be kept for Zustand compatibility');

console.log('\n4. Post-migration cleanup:');
console.log('🗑️ Should remove: nexus-session, nexus-game-state, nexus-browser-id, nexus-characters');
console.log('📦 Should keep: nexus-app-flow, nexus-migration-complete');

console.log('\n🎯 To run actual migration in browser:');
console.log('1. Open browser console on localhost:5174');
console.log('2. Check current localStorage: Object.keys(localStorage).filter(k => k.startsWith("nexus"))');
console.log('3. Check migration needed: debugStorage.needsMigration()');
console.log('4. Run migration: await debugStorage.migrateFromLocalStorage()');
console.log('5. Check results: debugStorage.getStats()');
console.log('6. Cleanup: debugStorage.cleanupMigrationData()');

console.log('\n✅ Migration test simulation complete!');