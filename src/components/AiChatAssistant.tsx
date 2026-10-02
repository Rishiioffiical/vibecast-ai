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
} from 'lucide-react';
import { getApiHeaders } from '../utils/apiClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
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
        'Greetings! I am your **Velvet Vox Editorial Script Assistant**. I can help you compose poignant Hindi Shayaris, dramatic cinematic monologues, historical narratives, and podcast scripts crafted for natural speech synthesis. What are we voicing today?',
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

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: getApiHeaders(),
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
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: 'Sorry, could not connect to the editorial engine. Please try again.',
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
    'Write a deep emotional Hindi shayari',
    'Cinematic monologue about destiny',
    'Nostalgic reflection on childhood memories',
    'Inspirational podcast opening',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-2xl h-[620px] max-h-[90vh] bg-[#FAF7EF] border-2 border-[#D8CEBC] rounded-[32px] shadow-2xl flex flex-col overflow-hidden text-[#1F261F]">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2DAD0] bg-[#EFE9DA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#B83848] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-display text-[#1C221D]">
                Velvet Vox Scriptwriter
              </h3>
              <p className="text-xs text-[#5F6A60]">
                Editorial Script & Dialogue Assistant (Powered by Gemini AI)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF7EF] text-[#35523E] hover:bg-[#DED5C2] flex items-center justify-center transition-colors cursor-pointer border border-[#D5CABB]"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Quick Prompt Suggestions */}
        <div className="p-3 border-b border-[#E2DAD0] bg-[#FAF7EF] flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] uppercase font-mono tracking-wider font-bold text-[#78857B] flex-shrink-0">
            Themes:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={isLoading}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-[#EFE9DB] hover:bg-[#B83848] text-[#2C382E] hover:text-white border border-[#D5CABB] transition-all cursor-pointer font-medium"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => {
            const isBot = msg.role === 'model';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs shadow-sm ${
                    isBot
                      ? 'bg-[#B83848] text-white'
                      : 'bg-[#2E4E3B] text-white'
                  }`}
                >
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-[24px] p-4 text-xs sm:text-sm leading-relaxed border ${
                    isBot
                      ? 'bg-white border-[#E2DAD0] text-[#1C221D] shadow-sm'
                      : 'bg-[#2E4E3B] border-[#254131] text-[#FAF7EF] shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-serif-display text-sm sm:text-base leading-relaxed">
                    {msg.content}
                  </p>

                  {/* Actions for Bot Messages */}
                  {isBot && msg.id !== 'welcome' && (
                    <div className="mt-3 pt-3 border-t border-[#EAE3D4] flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EFE9DB] hover:bg-[#E2DAC8] text-xs font-semibold text-[#2C382E] transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
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
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#B83848] hover:bg-[#A02D3C] text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Insert in Studio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-[#B83848] font-semibold">
              <div className="w-8 h-8 rounded-full bg-[#B83848] text-white flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span className="font-serif-display text-sm">Composing editorial voice script...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#E2DAD0] bg-[#EFE9DA]">
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
              placeholder="Ask for an emotional script, dramatic poetry, or dialogue advice..."
              className="flex-1 bg-white border border-[#D5CABB] focus:border-[#B83848] text-[#1C221D] rounded-full px-5 py-3 text-xs sm:text-sm outline-none transition-colors shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="px-6 py-3 rounded-full bg-[#B83848] hover:bg-[#9E2A3B] text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
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
