'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Send,
  Mic,
  MicOff,
  Minimize2,
  Maximize2,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MinimalAICompanion - A compact, non-intrusive AI assistant panel
 *
 * Design philosophy:
 * - Minimal by default, expandable on demand
 * - AI is a tool, not a crutch - real interviews grade on YOUR understanding
 * - Compact floating design that doesn't distract from coding
 * - Quick access for hints without spamming the AI
 *
 * This simulates real Meta/Google AI-assisted interviews where:
 * - AI is optional and available
 * - You're graded on understanding, not AI usage frequency
 * - Code quality and your explanations matter most
 */

interface Message {
  type: 'user' | 'ai';
  message: string;
  timestamp?: number;
}

interface MinimalAICompanionProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  className?: string;
  disabled?: boolean;
}

export function MinimalAICompanion({
  messages,
  onSendMessage,
  isLoading = false,
  isRecording = false,
  onToggleRecording,
  className,
  disabled = false,
}: MinimalAICompanionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, isExpanded]);

  const handleSend = () => {
    if (!input.trim() || isLoading || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Fully minimized state - just a small floating button
  if (isMinimized) {
    return (
      <div className={cn('fixed bottom-4 right-4 z-50', className)}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-10 w-10 rounded-full bg-muted/90 hover:bg-muted border border-border shadow-lg backdrop-blur-sm"
          title="Open AI Assistant"
        >
          <Bot className="h-5 w-5 text-[#c4703f]" />
        </Button>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#c4703f] rounded-full text-[10px] flex items-center justify-center text-white font-medium">
            {messages.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl transition-all duration-200',
        isExpanded ? 'w-80' : 'w-64',
        className
      )}
    >
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border cursor-pointer hover:bg-muted/50"
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="h-4 w-4 text-[#c4703f]" />
            <div className="absolute inset-0 bg-[#c4703f] rounded-full blur-sm opacity-30" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            optional
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Collapsed Quick Actions */}
      {!isExpanded && (
        <div className="p-2">
          <div className="flex gap-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Quick question..."
              className="flex-1 bg-muted border-border text-foreground text-xs h-7 placeholder:text-muted-foreground"
              onKeyPress={handleKeyPress}
              disabled={isLoading || disabled}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || disabled}
              className="h-7 w-7 p-0 bg-[#c4703f] hover:bg-[#c4703f]/80"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full mt-1 text-[10px] text-muted-foreground hover:text-muted-foreground text-center"
            >
              View {messages.length} message{messages.length !== 1 ? 's' : ''} ↑
            </button>
          )}
        </div>
      )}

      {/* Expanded Chat View */}
      {isExpanded && (
        <>
          {/* Reminder about AI usage */}
          <div className="px-3 py-1.5 bg-muted/50 border-b border-border">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-yellow-500" />
              <span>
                Use AI strategically. You're graded on <span className="text-foreground">understanding</span>, not AI usage.
              </span>
            </p>
          </div>

          {/* Messages */}
          <div className="h-48 overflow-y-auto p-2 space-y-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Bot className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  Ask for hints, debugging help, or algorithm suggestions.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Remember: explain your reasoning to the interviewer!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex',
                    msg.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] px-2.5 py-1.5 rounded-lg text-xs',
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border">
            <div className="flex gap-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRecording ? 'Listening...' : 'Ask for help...'}
                className="flex-1 bg-muted border-border text-foreground text-xs h-7 placeholder:text-muted-foreground"
                onKeyPress={handleKeyPress}
                disabled={isLoading || disabled || isRecording}
              />
              {onToggleRecording && (
                <Button
                  onClick={onToggleRecording}
                  disabled={isLoading || disabled}
                  className={cn(
                    'h-7 w-7 p-0',
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-muted hover:bg-muted'
                  )}
                >
                  {isRecording ? (
                    <MicOff className="h-3 w-3" />
                  ) : (
                    <Mic className="h-3 w-3" />
                  )}
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || disabled}
                className="h-7 w-7 p-0 bg-[#c4703f] hover:bg-[#c4703f]/80"
              >
                {isLoading ? (
                  <div className="h-3 w-3 border border-border border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MinimalAICompanion;
