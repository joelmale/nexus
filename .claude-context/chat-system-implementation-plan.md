# Chat System Implementation Plan

## Phase 2: Advanced Features & Polish

### 2.1 Message Types Implementation

#### Private Whispers ✅ Partially Implemented
- **Current State**: Backend supports `recipientId` field, frontend has whisper message type
- **Missing**: UI for selecting whisper recipients
- **Implementation Plan**:
  - Add recipient selector dropdown in ChatPanel
  - Filter whisper visibility (only sender, recipient, and DM can see)
  - Add "Whisper to:" prefix in message display

#### Roll Integration ❌ Not Implemented
- **Current State**: Dice rolls are separate from chat system
- **Implementation Plan**:
  - Modify `DiceRoller.tsx` to send system messages on rolls
  - Add roll result formatting to chat (e.g., "🎲 Player rolled 2d6+3 = 12")
  - Make roll visibility configurable (public/private)

### 2.2 Enhanced UX Features

#### Message History ❌ Not Implemented
- **Current State**: Messages exist only in memory
- **Implementation Plan**:
  - Add chat persistence to IndexedDB (similar to existing game state)
  - Load last N messages on room join
  - Handle message deduplication on reconnect

#### Browser Notifications ❌ Not Implemented
- **Current State**: Only toast notifications exist
- **Implementation Plan**:
  - Add Notification API permission request
  - Trigger notifications for: mentions (@username), whispers, DM announcements
  - Respect user's notification preferences

## Phase 3: Integration & Server-Side Enhancements

### 3.1 UI Integration

#### Minimize/Maximize Chat ❌ Not Implemented
- **Current State**: Chat panel uses existing panel system
- **Implementation Plan**:
  - Add collapse/expand toggle to chat header
  - Persist collapsed state in localStorage
  - Animate collapse with smooth transitions

#### Enhanced Accessibility ✅ Partially Implemented
- **Current State**: Basic ARIA roles exist, accessibility.css imported
- **Missing**: Full keyboard navigation for chat
- **Implementation Plan**:
  - Add keyboard shortcuts (Ctrl+Enter to send, arrow keys for history)
  - Screen reader announcements for new messages
  - Focus management when chat opens/closes

### 3.2 Server-Side Enhancements

#### Message Persistence ❌ Not Implemented
- **Current State**: No server-side storage
- **Implementation Plan**:
  - Add chat history table to server database
  - Store messages per room with TTL (e.g., 7 days)
  - Sync history on client join

#### Rate Limiting ❌ Not Implemented
- **Current State**: No spam protection
- **Implementation Plan**:
  - Add per-user message rate limiting (e.g., 10 messages/minute)
  - Implement exponential backoff for violations
  - Add client-side rate limiting as well

#### Moderation Tools ❌ Not Implemented
- **Current State**: No moderation features
- **Implementation Plan**:
  - DM-only: Delete messages, mute users, clear chat history
  - Add moderation event types to WebSocket
  - UI indicators for moderated content

## Implementation Priority & Timeline

### High Priority (Week 1-2)
1. **Private Whispers UI** (2-3 hours)
2. **Roll Integration** (2-3 hours)
3. **Chat Minimize/Maximize** (1-2 hours)
4. **Message History Persistence** (3-4 hours)

### Medium Priority (Week 3)
5. **Browser Notifications** (2-3 hours)
6. **Enhanced Accessibility** (2-3 hours)

### Low Priority (Week 4)
7. **Server-Side Persistence** (4-5 hours)
8. **Rate Limiting** (2-3 hours)
9. **Moderation Tools** (3-4 hours)

## Technical Implementation Details

### WebSocket Message Flow Extensions
```typescript
// New message types
type ChatMessageType = 'text' | 'system' | 'dm-announcement' | 'whisper' | 'roll-result';

// Server-side rate limiting
interface RateLimit {
  userId: string;
  messages: number;
  lastReset: number;
  mutedUntil?: number;
}
```

### Database Schema Additions
```sql
-- Chat history table
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL,
  recipient_id TEXT,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting table
CREATE TABLE user_rate_limits (
  user_id TEXT PRIMARY KEY,
  messages_sent INTEGER DEFAULT 0,
  last_reset INTEGER NOT NULL,
  muted_until INTEGER
);
```

### State Management Extensions
```typescript
// Enhanced chat state
chat: {
  messages: ChatMessage[],
  typingUsers: Set<string>,
  unreadCount: 0,
  isMinimized: boolean,        // New: collapse state
  historyLoaded: boolean,      // New: history sync status
  rateLimited: boolean,        // New: rate limit status
}
```

## Success Criteria Verification

- **Whispers**: ✅ UI for recipient selection, ✅ proper visibility filtering
- **Roll Integration**: ✅ Automatic chat messages for dice rolls
- **Message History**: ✅ Persistent across sessions, ✅ sync on join
- **Notifications**: ✅ Browser notifications for mentions/whispers
- **Minimize/Maximize**: ✅ Collapsible interface with state persistence
- **Accessibility**: ✅ Full keyboard navigation, ✅ screen reader support
- **Server Persistence**: ✅ Chat history stored per room
- **Rate Limiting**: ✅ Spam prevention with backoff
- **Moderation**: ✅ DM tools for message deletion and user muting