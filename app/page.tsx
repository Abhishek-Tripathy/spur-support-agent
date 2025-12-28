'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Message } from '@/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'agent',
      content: 'Hello! Welcome to Spur Support. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorConfig, setErrorConfig] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: '',
  });
  const [sessionId, setSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
    if (val.length > 500) {
      setErrorConfig({ show: true, msg: 'Message too long (max 500 chars)' });
    } else if (errorConfig.show) {
      setErrorConfig({ show: false, msg: '' });
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (inputValue.length > 500) {
      setErrorConfig({ show: true, msg: 'Please shorten your message.' });
      return;
    }

    const userText = inputValue.trim();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();

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
      setErrorConfig({ show: true, msg: 'Failed to connect. Please try again.' });
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
    <main className="h-screen bg-[#1c1c1c] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[calc(100vh-2rem)] max-h-[800px] bg-[#212121] rounded-xl shadow-2xl overflow-hidden border border-[#3d3d3d] flex flex-col">
        
        {/* Header */}
        <header className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff6c37] to-[#ff8c5a] flex items-center justify-center text-white shadow-lg">
            <Bot size={22} />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-white text-lg">Spur Support</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-xs text-gray-400">Online • Typically replies instantly</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1c1c1c]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3 text-sm relative group",
                    isUser
                      ? "bg-gradient-to-r from-[#ff6c37] to-[#ff8c5a] text-white rounded-br-sm"
                      : "bg-[#2d2d2d] text-gray-100 border border-[#3d3d3d] rounded-bl-sm"
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span
                    suppressHydrationWarning
                    className={cn(
                      "text-[10px] absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity",
                      isUser ? "right-1 text-gray-500" : "left-1 text-gray-500"
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
              <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#ff6c37] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-[#ff6c37] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-[#ff6c37] rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[#2d2d2d] border-t border-[#3d3d3d] p-4 shrink-0">
          {errorConfig.show && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-3 bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              <span>{errorConfig.msg}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Type your message..."
              className={cn(
                "flex-1 bg-[#1c1c1c] text-gray-100 placeholder:text-gray-500 text-sm rounded-lg py-3 px-4",
                "focus:outline-none focus:ring-2 focus:ring-[#ff6c37]/50 border border-[#3d3d3d] focus:border-[#ff6c37]",
                "transition-all duration-200",
                errorConfig.show && "border-red-500/50 focus:ring-red-500/30"
              )}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || inputValue.length > 500}
              className={cn(
                "p-3 rounded-lg transition-all duration-200 flex items-center justify-center",
                !inputValue.trim() || isLoading || inputValue.length > 500
                  ? "bg-[#3d3d3d] text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#ff6c37] to-[#ff8c5a] text-white hover:shadow-lg hover:shadow-[#ff6c37]/25 active:scale-95"
              )}
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-500 mt-3">
            Powered by Spur AI • Built with ❤️
          </p>
        </div>
      </div>
    </main>
  );
}
