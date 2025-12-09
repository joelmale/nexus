/**
 * Chat Panel Component
 *
 * Real-time chat interface for players and DMs.
 * Supports text messages, system announcements, and private whispers.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGameStore, useIsHost } from '@/stores/gameStore';
import type { ChatMessage as ChatMessageType } from '@/types/game';

interface ChatMessageProps {
  message: ChatMessageType['data'];
  isOwnMessage: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage }) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'system':
        return '📢';
      case 'dm-announcement':
        return '👑';
      case 'whisper':
        return '🕵️';
      default:
        return '';
    }
  };

  const getMessageTypeLabel = (messageType: string) => {
    switch (messageType) {
      case 'system':
        return 'System';
      case 'dm-announcement':
        return 'DM Announcement';
      case 'whisper':
        return 'Whisper';
      default:
        return '';
    }
  };

  return (
    <div
      className={`chat-panel__message ${isOwnMessage ? 'chat-panel__message--own' : 'chat-panel__message--other'} ${message.messageType}`}
    >
      <div className="chat-panel__message-header">
        <span className="chat-panel__message-author">{message.userName}</span>
        {message.messageType !== 'text' && (
          <span className="chat-panel__message-type">
            {getMessageTypeIcon(message.messageType)}{' '}
            {getMessageTypeLabel(message.messageType)}
          </span>
        )}
        <span className="chat-panel__message-timestamp">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
      <div
        className="chat-panel__message-content"
        dangerouslySetInnerHTML={{ __html: message.content }}
      />
      {message.messageType === 'whisper' && message.recipientId && (
        <div className="chat-panel__message-recipient">To: {message.recipientId}</div>
      )}
    </div>
  );
};

export const ChatPanel: React.FC = () => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messageType, setMessageType] = useState<'text' | 'whisper'>('text');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { chat, user, session, sendChatMessage, setTyping, markChatAsRead } =
    useGameStore();

  const isHost = useIsHost();

  // Filter messages based on visibility rules
  const visibleMessages = chat.messages.filter((message) => {
    // Always show system messages and DM announcements
    if (
      message.messageType === 'system' ||
      message.messageType === 'dm-announcement'
    ) {
      return true;
    }

    // Show public messages to everyone
    if (message.messageType === 'text') {
      return true;
    }

    // For whispers, only show to sender, recipient, and DM
    if (message.messageType === 'whisper') {
      return (
        message.userId === user.id || // Sender can see
        message.recipientId === user.id || // Recipient can see
        isHost // DM can see all whispers
      );
    }

    return true;
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  // Mark chat as read when panel is viewed
  useEffect(() => {
    markChatAsRead();
  }, [markChatAsRead]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setMessageInput(value);

    // Send typing indicator
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      setTyping(true);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 3000);
    } else if (isTyping && !value.trim()) {
      setIsTyping(false);
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !session) return;
    if (messageType === 'whisper' && !selectedRecipient) return;

    sendChatMessage(
      messageInput.trim(),
      messageType,
      messageType === 'whisper' ? selectedRecipient : undefined,
    );
    setMessageInput('');
    setSelectedRecipient('');
    setIsTyping(false);
    setTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendDMAnnouncement = () => {
    if (!messageInput.trim() || !session || !isHost) return;

    sendChatMessage(messageInput.trim(), 'dm-announcement');
    setMessageInput('');
  };

  return (
    <div className="chat-panel">
      <div className="panel-section">
        <h3>Chat</h3>

        {/* Messages Area */}
        <div className="chat-panel__messages">
          {visibleMessages.length === 0 ? (
            <div className="chat-panel__empty">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            visibleMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwnMessage={message.userId === user.id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicators */}
        {chat.typingUsers.length > 0 && (
          <div className="chat-panel__typing-indicators">
            {chat.typingUsers.map((typingUser) => (
              <span key={typingUser.userId} className="chat-panel__typing-user">
                {typingUser.userName} is typing...
              </span>
            ))}
          </div>
        )}

        {/* Message Input */}
        <div className="chat-panel__input-section">
          {/* Message Type Selector */}
          <div className="chat-panel__type-selector">
            <select
              value={messageType}
              onChange={(e) => {
                setMessageType(e.target.value as 'text' | 'whisper');
                if (e.target.value === 'text') {
                  setSelectedRecipient('');
                }
              }}
              className="chat-panel__type-select"
            >
              <option value="text">Public</option>
              <option value="whisper">Whisper</option>
            </select>

            {messageType === 'whisper' && session && (
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="chat-panel__recipient-select"
              >
                <option value="">Select recipient...</option>
                {session.players
                  .filter((player) => player.id !== user.id) // Don't include self
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="chat-panel__input-container">
            <textarea
              className="chat-panel__input"
              placeholder={
                messageType === 'whisper'
                  ? selectedRecipient
                    ? `Whisper to ${session?.players.find((p) => p.id === selectedRecipient)?.name}...`
                    : 'Select a recipient first...'
                  : 'Type a message...'
              }
              value={messageInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyPress}
              rows={1}
              maxLength={500}
              disabled={messageType === 'whisper' && !selectedRecipient}
            />
            <button
              className="chat-panel__send-btn"
              onClick={handleSendMessage}
              disabled={
                !messageInput.trim() ||
                (messageType === 'whisper' && !selectedRecipient)
              }
              title="Send message (Enter)"
            >
              {messageType === 'whisper' ? '🕵️' : '📤'}
            </button>
          </div>

          {/* DM Announcement Button (Host Only) */}
          {isHost && (
            <button
              className="chat-panel__announcement-btn"
              onClick={handleSendDMAnnouncement}
              disabled={!messageInput.trim()}
              title="Send DM Announcement"
            >
              👑 Announce
            </button>
          )}
        </div>

        {/* Unread Count Badge */}
        {chat.unreadCount > 0 && (
          <div className="chat-panel__unread-badge">{chat.unreadCount} unread</div>
        )}
      </div>
    </div>
  );
};
