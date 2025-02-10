import { Chat, Message } from './types';

const STORAGE_KEY = 'ai-chat-history';

export function saveChat(chat: Chat) {
  const chats = getAllChats();
  const existingIndex = chats.findIndex((c) => c.id === chat.id);
  
  if (existingIndex >= 0) {
    chats[existingIndex] = chat;
  } else {
    chats.push(chat);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function getAllChats(): Chat[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getChatById(id: string): Chat | undefined {
  return getAllChats().find((chat) => chat.id === id);
}

export function deleteChat(id: string) {
  const chats = getAllChats().filter((chat) => chat.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}