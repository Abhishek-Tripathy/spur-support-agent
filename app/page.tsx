'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Message } from '@/types';

// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'agent',
      content: 'Hello! I am your Spur Support Agent. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorConfig, setErrorConfig] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Focus input on mount & Restore Session
  useEffect(() => {
    inputRef.current?.focus();

    const storedSessionId = sessionStorage.getItem('spur-session-id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadHistory(storedSessionId);
    }
  }, []);

  const loadHistory = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat?sessionId=${id}`);
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'agent',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })));
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Dynamic validation reset or warning
    if (val.length > 500) {
      setErrorConfig({ show: true, msg: 'Message is too long (max 500 chars).' });
    } else {
      if (errorConfig.show) setErrorConfig({ show: false, msg: '' });
    }
  };

  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (inputValue.length > 500) {
      setErrorConfig({ show: true, msg: 'Please shorten your message before sending.' });
      return;
    }

    const userText = inputValue.trim();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    // 1. Add User Message
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // 2. Real API Call
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();

      // Update Session ID if it's new
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        sessionStorage.setItem('spur-session-id', data.sessionId);
      }

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setErrorConfig({ show: true, msg: 'Failed to connect to the agent.' });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[600px] md:h-[700px]">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-100 p-4 flex items-center gap-3 shadow-sm z-10">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="font-semibold text-gray-800">Spur Support</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-xs text-gray-500 font-medium">Online</p>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-gray-200">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative group",
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span 
                    suppressHydrationWarning
                    className={cn(
                      "text-[10px] absolute -bottom-5 min-w-max opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                      isUser ? "right-1 text-gray-400" : "left-1 text-gray-400"
                    )}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start w-full">
               <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          {errorConfig.show && (
            <div className="flex items-center gap-2 text-red-500 text-xs mb-2 animate-in slide-in-from-bottom-1 fade-in">
              <AlertCircle size={12} />
              <span>{errorConfig.msg}</span>
            </div>
          )}
          
          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Type your message..."
              className={cn(
                "flex-1 bg-gray-100 text-gray-900 placeholder:text-gray-400 text-sm rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all border border-transparent focus:border-indigo-200",
                errorConfig.show && "border-red-200 focus:border-red-300 focus:ring-red-100 bg-red-50"
              )}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || inputValue.length > 500}
              className={cn(
                "absolute right-1.5 p-2 rounded-full transition-all duration-200 flex items-center justify-center",
                !inputValue.trim() || isLoading || inputValue.length > 500
                  ? "bg-transparent text-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:scale-105 active:scale-95"
              )}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} className={inputValue.trim() && "ml-0.5"} />
              )}
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-400">
              Powered by Spur Support AI
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
