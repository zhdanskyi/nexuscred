'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender: any;
  recipient: any;
}

export default function TelegramView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
      
      const res = await fetch('/api/messages', {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          content: messageText,
          recipient_id: null // Broadcasting to all for MVP
        })
      });
      
      if (res.ok) {
        setMessageText('');
        fetchMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Derive unique contacts from messages
  const uniqueContactsMap = new Map();
  messages.forEach(msg => {
    if (msg.sender_id !== currentUserId && msg.sender) {
      uniqueContactsMap.set(msg.sender_id, msg.sender);
    }
  });
  const dynamicContacts = Array.from(uniqueContactsMap.entries()).map(([id, sender]) => ({
    id,
    name: sender.full_name || sender.username || 'Usuario',
    initials: (sender.full_name || sender.username || 'U').substring(0, 2).toUpperCase(),
    role: 'Miembro'
  }));
  
  if (dynamicContacts.length === 0) {
    dynamicContacts.push({ id: 'system', name: 'Chat General', initials: 'CG', role: 'Canal' });
  }

  const [activeContact, setActiveContact] = useState(dynamicContacts[0]);

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Contact List */}
      <div className="hidden md:flex flex-col w-72 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.04]">
          <h3 className="text-sm font-light text-white/50">Mensajes</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {dynamicContacts.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveContact(c)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-300 ${
                activeContact?.id === c.id ? 'bg-white/[0.05] border border-white/[0.06]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-xl border border-white/5 flex items-center justify-center text-xs text-white/30 font-medium shrink-0">
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50 font-light truncate">{c.name}</span>
                </div>
                <p className="text-[11px] text-white/20 truncate">{c.role}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
          <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-xl border border-white/5 flex items-center justify-center text-xs text-white/30 font-medium">
            {activeContact?.initials || 'CG'}
          </div>
          <div>
            <p className="text-sm text-white/60 font-light">{activeContact?.name || 'Chat General'}</p>
            <p className="text-[10px] text-white/15">{activeContact?.role || 'Canal'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
            <span className="text-[10px] text-white/15">Activo</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === currentUserId;
            const msgTime = new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                  isMe
                    ? 'bg-black/50 backdrop-blur-2xl border border-white/8'
                    : 'bg-black/30 backdrop-blur-xl border border-white/[0.04]'
                }`}>
                  {!isMe && msg.sender && (
                    <p className="text-[10px] text-emerald-400/50 mb-1">{msg.sender.full_name || msg.sender.username}</p>
                  )}
                  <p className="text-sm text-white/55 font-light leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-white/10 mt-1.5 text-right">{msgTime}</p>
                </div>
              </motion.div>
            );
          })}
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
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
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
