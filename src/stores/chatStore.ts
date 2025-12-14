import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ChatMessage } from '@/types/game';

interface ChatStore {
  messages: ChatMessage['data'][];
  typingUsers: Map<string, { name: string; timestamp: number }>;
  unreadCount: number;

  // Actions
  addMessage: (message: ChatMessage['data']) => void;
  clearMessages: () => void;
  setUserTyping: (userId: string, userName: string) => void;
  clearUserTyping: (userId: string) => void;
  markAsRead: () => void;
  deleteMessage: (messageId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  immer((set) => ({
    messages: [],
    typingUsers: new Map(),
    unreadCount: 0,

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
        // Limit message history to last 200 messages
        if (state.messages.length > 200) {
          state.messages = state.messages.slice(-200);
        }
        state.unreadCount += 1;
      }),

    clearMessages: () =>
      set((state) => {
        state.messages = [];
        state.unreadCount = 0;
      }),

    setUserTyping: (userId, userName) =>
      set((state) => {
        state.typingUsers.set(userId, {
          name: userName,
          timestamp: Date.now(),
        });
      }),

    clearUserTyping: (userId) =>
      set((state) => {
        state.typingUsers.delete(userId);
      }),

    markAsRead: () =>
      set((state) => {
        state.unreadCount = 0;
      }),

    deleteMessage: (messageId) =>
      set((state) => {
        const index = state.messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          state.messages.splice(index, 1);
        }
      }),
  })),
);

// Selector hooks
export const useChatMessages = () => useChatStore((state) => state.messages);
export const useChatUnreadCount = () => useChatStore((state) => state.unreadCount);
export const useTypingUsers = () => useChatStore((state) => state.typingUsers);
