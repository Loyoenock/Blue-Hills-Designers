'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function AIStylist() {
  const currentUser = useStore((state) => state.currentUser);
  const settings = useStore((state) => state.settings);
  const products = useStore((state) => state.products);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const saved = localStorage.getItem('blue_hills_styling_chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse saved chat history:', e);
      }
    }
    // Fallback default message
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: 'WELCOME_PLACEHOLDER'
      }
    ]);
  }, []);

  // Save chat history to localStorage on changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('blue_hills_styling_chat', JSON.stringify(messages));
    }
  }, [messages]);

  const quickPrompts = [
    { label: 'Office Outfits', text: 'Recommend a ready-made corporate outfit for a busy work day.' },
    { label: 'Imported Shirts', text: 'Tell me about your premium imported shirts from Turkey and Egypt.' },
    { label: 'Lubowa Showroom Lounge', text: 'How can I visit your Lubowa Shopping Mall showroom to try on clothes?' },
    { label: 'Camel Hair Overcoat Offer', text: 'What are the details of the Lubowa Camel Hair Executive Overcoat on special offer?' }
  ];

  const getFormattedContent = (msg: ChatMessage) => {
    if (msg.id === 'welcome') {
      const greeting = settings?.aiGreetingPrefix || 'Hello! Welcome to Blue Hills Designers.';
      let displayGreeting = greeting;
      if (currentUser) {
        if (greeting.startsWith('Hello!')) {
          displayGreeting = greeting.replace('Hello!', `Hello, ${currentUser.name}!`);
        } else if (greeting.startsWith('Good day, Executive.')) {
          displayGreeting = greeting.replace('Good day, Executive.', `Good day, Mr. ${currentUser.name}.`);
        } else {
          displayGreeting = `${greeting}, ${currentUser.name}.`;
        }
      }
      return `${displayGreeting} I am your personal styling assistant.\n\nWe specialize in high-quality ready-made corporate clothing imported from Turkey, Egypt, China, and the UK. Whether you are dressing for a client meeting, a presentation, or daily office work, I can help you find the perfect ready-made outfit. How can I help you today?`;
    }
    return msg.content;
  };

  useEffect(() => {
    if (messages.length > 1 && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: `user-msg-${messages.length + 1}`,
      role: 'user',
      content: textToSend
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.id === 'welcome' ? getFormattedContent(m) : m.content
          })),
          userName: currentUser ? currentUser.name : undefined,
          products: products,
          settings: settings
        })
      });

      let errorMessage = '';
      if (!response.ok) {
        try {
          const errData = await response.json();
          errorMessage = errData.error || errData.message || 'API line disconnected';
        } catch {
          errorMessage = 'API line disconnected';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setMessages(curr => [...curr, {
        id: `model-msg-${curr.length + 1}`,
        role: 'model',
        content: data.text
      }]);
    } catch (err: any) {
      const greeting = currentUser ? `Mr. ${currentUser.name}` : 'Sir';
      const supportNo = settings?.supportPhone || settings?.conciergePhone || '+256 (772) 123-456';
      
      let errorText = `I apologize, ${greeting}. A brief connection issue occurred. We recommend reviewing our exquisite Monaco Navy Suits or Imperial Cognac Oxfords in stock today, or contacting our support directly at ${supportNo}.`;
      
      if (err.message && err.message.toLowerCase().includes('rate limit')) {
        errorText = `I apologize, ${greeting}. To preserve elite quality, our styling desk is receiving a high volume of requests at this moment. Please wait a moment before sending another style inquiry.`;
      } else if (err.message && err.message.toLowerCase().includes('limit exceeded')) {
        errorText = `I apologize, ${greeting}. We have reached the session styling depth limit. Kindly use the "Reset Dialog" option above to start a fresh styling register.`;
      }

      setMessages(curr => [...curr, {
        id: `error-msg-${curr.length + 1}`,
        role: 'model',
        content: errorText
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="stylist" className="py-24 bg-[#1D2B3F] border-t border-[#657892]/20 relative overflow-hidden">
      {/* Background visual decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#B9CDE5]/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#C6A15B]/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.3em] text-[#C6A15B] font-semibold">
            Personal assistant
          </span>
          <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#F7F5F0] mt-3">
            Elite AI Personal Stylist
          </h2>
          <p className="text-[#F7F5F0]/70 text-base md:text-lg max-w-2xl mx-auto mt-4 leading-relaxed font-light">
            Chat with our AI Stylist to find the best ready-made corporate outfits imported from Turkey, Egypt, China, and the UK, or to plan a visit to our Lubowa showroom.
          </p>
        </div>

        {/* Chat Platform */}
        <div className="bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[650px] text-[#1D2B3F]" id="ai-stylist-chat-container">
          {/* Header */}
          <div className="border-b border-[#657892]/10 px-6 py-4 bg-[#B9CDE5]/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#1C4D8D]/10 flex items-center justify-center border border-[#1C4D8D]/30 relative">
                <Sparkles className="w-5 h-5 text-[#C6A15B]" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#C6A15B] rounded-full border-2 border-[#F7F5F0]"></span>
              </div>
              <div>
                <h3 className="font-serif text-sm md:text-base font-semibold text-[#1D2B3F] tracking-wide">
                  Blue Hills Stylist Desk
                </h3>
                <p className="text-[10px] md:text-xs text-[#657892] font-mono">
                  Active • Ready-to-Wear Styling Advisory
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                const resetMsg: ChatMessage[] = [
                  {
                    id: 'welcome',
                    role: 'model',
                    content: 'Good day, Executive. I am your Blue Hills Designers Personal Styling Support. How can I help orchestrate your visual presence today?'
                  }
                ];
                setMessages(resetMsg);
                localStorage.setItem('blue_hills_styling_chat', JSON.stringify(resetMsg));
              }}
              className="text-[#657892] hover:text-[#1C4D8D] flex items-center gap-1.5 text-xs transition-colors p-1"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono">Reset Dialog</span>
            </button>
          </div>

          {/* Messages Grid */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F5F0]/50" 
            style={{ contentVisibility: 'auto' }}
          >
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-[85%] md:max-w-[75%]`}>
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-full bg-[#C6A15B]/10 flex items-center justify-center shrink-0 border border-[#657892]/10 text-[#C6A15B]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                    <div 
                      className={`p-4 md:p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-[#1C4D8D] text-[#F7F5F0] font-medium rounded-tr-none shadow-lg shadow-[#1C4D8D]/10'
                          : 'bg-[#B9CDE5]/30 border border-[#657892]/10 text-[#1D2B3F] rounded-tl-none font-light'
                      }`}
                    >
                      {getFormattedContent(msg)}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-[#1C4D8D]/10 flex items-center justify-center shrink-0 border border-[#657892]/10 text-[#1D2B3F]">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C6A15B]/10 flex items-center justify-center shrink-0 border border-[#657892]/10 text-[#C6A15B]">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-[#B9CDE5]/30 border border-[#657892]/10 text-[#1D2B3F]/70 px-5 py-4 rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C6A15B]" />
                      <span>Boutique Stylist drafting counsel...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick reply templates */}
          {messages.length === 1 && (
            <div className="px-6 py-2 bg-[#B9CDE5]/10 border-t border-[#657892]/10 overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none">
              {quickPrompts.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleSend(p.text)}
                  className="bg-[#B9CDE5]/30 hover:bg-[#B9CDE5]/50 text-xs text-[#1D2B3F] px-4 py-2 rounded-full border border-[#657892]/20 transition-all shrink-0 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Panel */}
          <div className="border-t border-[#657892]/10 p-4 md:p-6 bg-[#B9CDE5]/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center space-x-3 bg-[#F7F5F0] rounded-xl border border-[#657892]/20 p-1.5 focus-within:border-[#1C4D8D] transition-colors"
            >
              <div className="pl-3 text-[#657892]/50 hidden sm:block">
                <HelpCircle className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Compose style inquiry (e.g. 'Coordinate a formal suit ensemble for an Entebbe state dinner')..."
                className="flex-1 bg-transparent border-0 outline-none ring-0 py-2.5 text-sm text-[#1D2B3F] placeholder-[#657892]/50 font-light focus:ring-0"
                disabled={isLoading}
                id="ai-stylist-input"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                  input.trim() && !isLoading
                    ? 'bg-[#1C4D8D] text-[#F7F5F0] hover:bg-[#1C4D8D]/95 hover:scale-105'
                    : 'bg-[#657892]/10 text-[#657892]/40 cursor-not-allowed'
                }`}
                id="ai-stylist-send-btn"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-center text-[#657892]/60 mt-3 font-mono">
              Leveraging advanced intelligence matching executive ready-to-wear styles. Imported for Kampala corporate executives.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
