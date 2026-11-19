import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { getAsyncApiHeaders } from '../utils/apiClient';

interface GroundingSource {
  title: string;
  uri: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  sources?: GroundingSource[];
}

interface AiChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertScript: (script: string) => void;
}

export const AiChatAssistant: React.FC<AiChatAssistantProps> = ({
  isOpen,
  onClose,
  onInsertScript,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Greetings! I am your VibeCast Editorial Script Assistant with live Google Search Grounding. I can research current topics, historical events, science explainers, or compose Hinglish explainers, Hindi Shayaris, and dramatic monologues crafted for natural 24kHz speech synthesis. What are we voicing today?',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const historyPayload = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const headers = await getAsyncApiHeaders();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: historyPayload }),
      });

      if (!res.ok) {
        throw new Error('AI Chat response failed.');
      }

      const data = await res.json();
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply || 'No response received from the assistant.',
        sources: Array.isArray(data.sources) ? data.sources : [],
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: 'Could not connect to the editorial script engine. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Write a Hinglish educational script on ISRO space missions',
    'Write a deep emotional Hindi shayari',
    'Latest AI & quantum computing explainer in Hinglish',
    'Cinematic English documentary opening',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75">
      <div className="relative w-full max-w-2xl h-[620px] max-h-[90vh] spatial-glass border border-white/20 rounded-[28px] shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/12 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-color)] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Editorial Scriptwriter</span>
                <span className="text-xs font-mono-numbers text-white/55 font-normal">
                  · Google Search Grounded
                </span>
              </h3>
              <p className="text-xs text-white/60">
                Compose Hinglish explainers, Hindi shayaris &amp; broadcast scripts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.08] text-white/80 hover:text-white hover:bg-white/[0.15] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-3 border-b border-white/10 bg-black/25 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-xs font-mono-numbers text-white/50 flex-shrink-0">
            Prompts:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-[var(--accent-color)] text-white/85 hover:text-white border border-white/12 transition-colors cursor-pointer font-medium whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isBot = msg.role === 'model';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${
                    isBot
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'bg-white/[0.12] text-white'
                  }`}
                >
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed border ${
                    isBot
                      ? 'bg-black/45 border-white/12 text-white/95'
                      : 'bg-[var(--accent-color)]/20 border-[var(--accent-color)]/40 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-serif-display text-sm sm:text-base leading-relaxed">
                    {msg.content}
                  </p>

                  {isBot && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                      <p className="text-[11px] font-mono-numbers text-white/60 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-[#38D9A9]" />
                        <span>Search Sources ({msg.sources.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={`${src.uri}-${sIdx}`}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-[11px] text-white/85 hover:text-white transition-colors max-w-[240px] truncate"
                            title={src.title}
                          >
                            <ExternalLink className="w-3 h-3 text-[#38D9A9] flex-shrink-0" />
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {isBot && msg.id !== 'welcome' && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          onInsertScript(msg.content);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold text-xs transition-opacity cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Use in Studio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-white/75 font-semibold">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-color)] text-white flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span className="font-serif-display text-sm">Composing voiceover script...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/12 bg-black/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask for a Hinglish explainer, emotional Hindi shayari, or podcast intro..."
              className="flex-1 bg-black/50 border border-white/15 focus:border-[var(--accent-color)] text-white placeholder:text-white/40 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold text-xs flex items-center gap-1.5 transition-opacity disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
