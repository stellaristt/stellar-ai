"use client";

import { useState, useEffect, useRef } from 'react';
import { Message, Chat } from '@/lib/types';
import { saveChat, getAllChats, deleteChat } from '@/lib/store';
import { OllamaAPI } from '@/lib/ollama';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ollama = new OllamaAPI();

const MODEL_OPTIONS = [
  'deepseek-r1:1.5b',
  'qwen2.5-coder:3b',
  'deepseek-coder:1.3b',
];

export default function ChatInterface() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    setChats(getAllChats());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isTyping]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((prev) => [...prev, newChat]);
    setCurrentChat(newChat);
    saveChat(newChat);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentChat) return;
    setError(null);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    const updatedChat: Chat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      updatedAt: Date.now(),
    };

    setCurrentChat(updatedChat);
    saveChat(updatedChat);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      const response = await ollama.chat({
        model: selectedModel,
        messages: [{ role: 'user', content: input }],
      });
    
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message.content,
        timestamp: Date.now(),
      };
    
      const finalChat: Chat = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage],
        updatedAt: Date.now(),
      };
    
      setCurrentChat(finalChat);
      saveChat(finalChat);
    } catch (error) {
      setError('Failed to connect to Ollama. Make sure Ollama is running locally.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId);
    setChats(getAllChats());
    if (currentChat?.id === chatId) {
      setCurrentChat(null);
    }
  };

  const handleEditChat = (chatId: string, title: string) => {
    setEditingChatId(chatId);
    setEditTitle(title);
  };

  const handleSaveChatTitle = (chatId: string) => {
    const updatedChats = chats.map(chat => chat.id === chatId ? { ...chat, title: editTitle } : chat);
    setChats(updatedChats);
    saveChat(updatedChats.find(chat => chat.id === chatId)!);
    setEditingChatId(null);
  };

  const renderMessage = (message: Message) => {
    const thinkMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
    const thinkContent = thinkMatch ? thinkMatch[1] : null;
    const messageContent = message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    
    return (
      <div key={message.id} className="mb-2">
        <div className={`p-2 rounded-md ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
          <ReactMarkdown>{messageContent}</ReactMarkdown>
        </div>
        {thinkContent && (
          <div className="mt-2 p-2 border-l-4 border-yellow-500 bg-yellow-100 text-yellow-900">
            <ReactMarkdown>{thinkContent}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-full h-full">
      <div className="w-64 bg-card border-r border-border p-4">
        <Button className="w-full mb-4" onClick={createNewChat} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {chats.map((chat) => (
            <div key={chat.id} className={`flex items-center justify-between p-2 rounded-lg mb-2 cursor-pointer hover:bg-accent ${currentChat?.id === chat.id ? 'bg-accent' : ''}`} onClick={() => setCurrentChat(chat)}>
              {editingChatId === chat.id ? (
                 <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => handleSaveChatTitle(chat.id)} onKeyPress={(e) => e.key === 'Enter' && handleSaveChatTitle(chat.id)} autoFocus />
              ) : (
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span className="truncate" onClick={() => handleEditChat(chat.id, chat.title)}>{chat.title === 'New Chat' ? `Chat ${chat.id.slice(-4)}` : chat.title}</span>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <span className="font-bold">StellarAI</span>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentChat ? (
          <>
            <ScrollArea className="flex-1 p-4">
            {currentChat.messages.map((message) => {
                const thinkMatch = message.content.match(
                  /<think>([\s\S]*?)<\/think>/
                );
                const thinkContent = thinkMatch ? thinkMatch[1] : null;
                const messageContent = message.content
                  .replace(/<think>[\s\S]*?<\/think>/, "")
                  .trim();

                return (
                  <div
                    key={message.id}
                    className={`mb-4 ${
                      message.role === "user" ? "ml-auto" : "mr-auto"
                    }`}
                  >
                    {/* Render bagian <think> di luar kotak chat */}
                    {thinkContent && thinkContent !== " " && (
                      <div className="mt-2 mb-3 p-2 border-l-4 border-cyan-500 bg-muted/30 text-black/40 max-w-[80%] rounded-lg">
                        <ReactMarkdown>{thinkContent}</ReactMarkdown>
                      </div>
                    )}
                    {/* Pesan utama */}
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                      }`}
                    >
                      <ReactMarkdown>{messageContent}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
              {isTyping && <div className="mr-auto p-2 rounded-lg bg-muted animate-pulse">AI is typing...</div>}
              {error && <div className="p-4 mb-4 text-destructive bg-destructive/10 rounded-lg">{error}</div>}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="p-4 border-t border-border flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." onKeyPress={(e) => e.key === 'Enter' && handleSend()} disabled={isLoading} />
              <Button onClick={handleSend} disabled={isLoading}><Send className="w-4 h-4" /></Button>
            </div>
          </>
        ) :
          <Button className="flex-1 flex items-center justify-center" onClick={createNewChat} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        }
      </div>
    </div>
  );
}
