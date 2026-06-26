'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function AIStylist() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Good day, Executive. I am your Blue Hills Designers Personal Styling Concierge.\n\nWhether you are preparing for a high-stakes board merger, a diplomatic summit, or a presidential state dinner, I am here to orchestrate your visual presence. What sartorial agenda can I assist you with today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { label: 'Boardroom Board Outfit', text: 'Coordinate an outfit for a high-profile corporate boardroom meeting.' },
    { label: 'Presidential Poplin Shirt', text: 'Tell me about the Ugandan President Poplin White Shirt and what makes it special.' },
    { label: 'Lubowa Fitting Lounge', text: 'What is the bespoke consultation process at your Lubowa Shopping Mall lounge?' },
    { label: 'Camel Hair Overcoat Offer', text: 'What are the details of the Lubowa Camel Hair Executive Overcoat on special offer?' }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    // Append user message cleanly
    setMessages(prev => {
      const userMsg: ChatMessage = {
        id: `user-msg-${prev.length + 1}`,
        role: 'user',
        content: textToSend
      };

      // We trigger the fetch async with the updated messages
      fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...prev, userMsg].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('API line disconnected');
        }
        const data = await response.json();
        setMessages(curr => [...curr, {
          id: `model-msg-${curr.length + 1}`,
          role: 'model',
          content: data.text
        }]);
      })
      .catch(() => {
        setMessages(curr => [...curr, {
          id: `error-msg-${curr.length + 1}`,
          role: 'model',
          content: 'I apologize, Sir. A brief tailoring interruption occurred on our digital desk. We recommend reviewing our exquisite Monaco Navy Suits or Imperial Cognac Oxfords in stock today, or contacting our concierge directly at +256 (772) 123-456.'
        }]);
      })
      .finally(() => {
        setIsLoading(false);
      });

      return [...prev, userMsg];
    });
  };

  return (
    <section id="stylist" className="py-24 bg-[#1D2B3F] border-t border-[#657892]/20 relative overflow-hidden">
      {/* Background visual decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#B9CDE5]/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#C6A15B]/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.3em] text-[#C6A15B] font-semibold">
            Personal Concierge
          </span>
          <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#F7F5F0] mt-3">
            Bespoke AI Personal Stylist
          </h2>
          <p className="text-[#F7F5F0]/70 text-base md:text-lg max-w-2xl mx-auto mt-4 leading-relaxed font-light">
            Speak directly with our digital tailoring desk to coordinate high-profile boardroom ensembles, explore premium Italian shoes, or reserve a private lounge fitting at Lubowa.
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
                  Active • Bespoke Tailoring Advisory
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'welcome',
                    role: 'model',
                    content: 'Good day, Executive. I am your Blue Hills Designers Personal Styling Concierge. How can I help orchestrate your visual presence today?'
                  }
                ]);
              }}
              className="text-[#657892] hover:text-[#1C4D8D] flex items-center gap-1.5 text-xs transition-colors p-1"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono">Reset Dialog</span>
            </button>
          </div>

          {/* Messages Grid */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F5F0]/50" style={{ contentVisibility: 'auto' }}>
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
                      {msg.content}
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
                      <span>Atelier Stylist drafting counsel...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
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
              Leveraging advanced intelligence matching traditional bespoke styles. Tailored for Kampala corporate executives.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
