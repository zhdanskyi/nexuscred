'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Shield } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

interface ChatMessage {
  id: string;
  sender: string;
  isMe: boolean;
  content: string;
  time: string;
  type: 'text' | 'system';
}

const contacts = [
  { id: '1', name: 'Elena Rodríguez', role: 'Freelancer', initials: 'ER', lastMsg: 'Credencial verificada ✓', time: '2m', unread: 2 },
  { id: '2', name: 'Marco Vidal', role: 'Auditor', initials: 'MV', lastMsg: 'Revisando certificado...', time: '15m', unread: 1 },
  { id: '3', name: 'Ana Torres', role: 'Company', initials: 'AT', lastMsg: 'Hash confirmado', time: '1h', unread: 0 },
  { id: '4', name: 'Luis Méndez', role: 'Freelancer', initials: 'LM', lastMsg: 'Bienvenido al sistema', time: '2d', unread: 0 },
];

const initialMessages: ChatMessage[] = [
  { id: '1', sender: 'Elena Rodríguez', isMe: false, content: 'Acabo de recibir la credencial, verificando el hash...', time: '10:23', type: 'text' },
  { id: '2', sender: 'Yo', isMe: true, content: 'El SHA-256 debería coincidir con el registro del ledger.', time: '10:24', type: 'text' },
  { id: '3', sender: 'Elena Rodríguez', isMe: false, content: '✓ Hash verificado: a7f3c9e2d1b4...', time: '10:25', type: 'text' },
  { id: '4', sender: 'Sistema', isMe: false, content: '🔒 Credencial "Blockchain Developer" compartida', time: '10:25', type: 'system' },
  { id: '5', sender: 'Elena Rodríguez', isMe: false, content: 'Todo en orden. La auditoría está completa.', time: '10:26', type: 'text' },
];

export default function TelegramView() {
  const [activeContact, setActiveContact] = useState(contacts[0]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages([
      ...messages,
      {
        id: String(Date.now()),
        sender: 'Yo',
        isMe: true,
        content: message,
        time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
      },
    ]);
    setMessage('');
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Contact List */}
      <div className="hidden md:flex flex-col w-72 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.04]">
          <h3 className="text-sm font-light text-white/50">Mensajes</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {contacts.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveContact(c)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-300 ${
                activeContact.id === c.id ? 'bg-white/[0.05] border border-white/[0.06]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-xl border border-white/5 flex items-center justify-center text-xs text-white/30 font-medium shrink-0">
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50 font-light truncate">{c.name}</span>
                  <span className="text-[10px] text-white/15 shrink-0">{c.time}</span>
                </div>
                <p className="text-[11px] text-white/20 truncate">{c.lastMsg}</p>
              </div>
              {c.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/40 shrink-0">{c.unread}</div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
          <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-xl border border-white/5 flex items-center justify-center text-xs text-white/30 font-medium">
            {activeContact.initials}
          </div>
          <div>
            <p className="text-sm text-white/60 font-light">{activeContact.name}</p>
            <p className="text-[10px] text-white/15">{activeContact.role}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
            <span className="text-[10px] text-white/15">Activo</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type === 'system' ? (
                <GlassCard variant="subtle" hover={false} className="px-4 py-2 mx-auto">
                  <div className="flex items-center gap-2">
                    <Shield size={11} className="text-white/15" />
                    <p className="text-[11px] text-white/20">{msg.content}</p>
                  </div>
                </GlassCard>
              ) : (
                <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                  msg.isMe
                    ? 'bg-black/50 backdrop-blur-2xl border border-white/8'
                    : 'bg-black/30 backdrop-blur-xl border border-white/[0.04]'
                }`}>
                  <p className="text-sm text-white/55 font-light leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-white/10 mt-1.5 text-right">{msg.time}</p>
                </div>
              )}
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-3 bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-3">
            <button className="text-white/10 hover:text-white/25 transition-colors">
              <Paperclip size={16} />
            </button>
            <input
              id="telegram-chat-input"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-transparent text-sm text-white/55 placeholder-white/10 outline-none font-light"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              className="w-8 h-8 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-white/25 hover:text-white/40 transition-colors"
            >
              <Send size={13} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
