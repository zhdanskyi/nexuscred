'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '@/components/ui/GlassButton';

interface Conversation {
  id: string;
  name: string | null;
  members: any[];
}

interface ChatMessage {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender: any;
}

export default function TelegramView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // For Add by Email
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setCurrentUserId(session.user.id);

      // Fetch conversations for this user
      const { data: members } = await supabase
        .from('chat_members')
        .select('conversation_id')
        .eq('user_id', session.user.id);

      if (members && members.length > 0) {
        const convoIds = members.map(m => m.conversation_id);
        const { data: convos } = await supabase
          .from('conversations')
          .select('*, chat_members(user_id, profiles!inner(full_name, username))')
          .in('id', convoIds);
        
        if (convos) {
          setConversations(convos);
          setActiveConvo(convos[0]);
        }
      }
    };
    init();
  }, []);

  // Fetch messages when active convo changes
  useEffect(() => {
    if (!activeConvo) return;
    const fetchMsgs = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, username)')
        .eq('conversation_id', activeConvo.id)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };
    fetchMsgs();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`room:${activeConvo.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${activeConvo.id}`
      }, async (payload) => {
        // Fetch sender profile for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', payload.new.sender_id)
          .single();
        
        const newMsg = { ...payload.new, sender: profile } as ChatMessage;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvo]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !activeConvo) return;
    const text = messageText;
    setMessageText(''); // Optimistic clear
    
    await supabase.from('messages').insert({
      sender_id: currentUserId,
      conversation_id: activeConvo.id,
      content: text
    });
  };

  const handleAddUser = async () => {
    if (!searchUsername.trim()) return;
    setIsAdding(true);
    try {
      // Find user
      const { data: userToAdd } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('username', searchUsername.split('@')[0]) // match logic from trigger
        .single();
      
      if (!userToAdd) {
        alert('Usuario no encontrado');
        setIsAdding(false);
        return;
      }

      // Create conversation
      const { data: convo } = await supabase
        .from('conversations')
        .insert({ name: `Chat con ${userToAdd.full_name || userToAdd.username}` })
        .select().single();

      if (convo) {
        // Add both to members
        await supabase.from('chat_members').insert([
          { conversation_id: convo.id, user_id: currentUserId },
          { conversation_id: convo.id, user_id: userToAdd.id }
        ]);

        // Reload convos
        const newConvo = {
          ...convo,
          members: [{ profiles: userToAdd }]
        };
        setConversations(prev => [...prev, newConvo]);
        setActiveConvo(newConvo);
        setShowAddForm(false);
      }
    } catch (err) {
      console.error(err);
    }
    setIsAdding(false);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Contact List */}
      <div className="hidden md:flex flex-col w-72 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.05)]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-sm font-medium text-slate-100">Mensajes</h3>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-white/60 hover:text-white transition-colors">
            <UserPlus size={16} />
          </button>
        </div>
        
        {showAddForm && (
          <div className="p-3 bg-white/5 border-b border-white/10">
            <input 
              type="text" 
              placeholder="Email o Usuario..." 
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="w-full bg-white/10 text-white placeholder-white/40 text-xs px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-white/30"
            />
            <GlassButton size="sm" className="w-full mt-2" onClick={handleAddUser} loading={isAdding}>
              Crear Chat
            </GlassButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c, i) => {
            const otherMember = c.members?.find((m: any) => m.profiles?.username !== searchUsername)?.profiles || c.members?.[0]?.profiles || { full_name: 'Chat', username: 'C' };
            const initials = (otherMember.full_name || otherMember.username || 'C').substring(0, 2).toUpperCase();
            
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveConvo(c)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-300 ${
                  activeConvo?.id === c.id ? 'bg-white/20 border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'hover:bg-white/10'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-xs text-white font-medium shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-100 font-medium truncate">{c.name || otherMember.full_name || otherMember.username}</span>
                  </div>
                  <p className="text-[11px] text-white/60 truncate">Ver conversación</p>
                </div>
              </motion.button>
            );
          })}
          {conversations.length === 0 && !showAddForm && (
            <div className="p-4 text-center text-white/40 text-xs">
              No tienes conversaciones. Haz clic en el botón + para empezar.
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)]">
        {activeConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/5">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-xs text-white font-medium">
                #
              </div>
              <div>
                <p className="text-sm text-slate-100 font-medium">{activeConvo.name || 'Chat'}</p>
                <p className="text-[10px] text-white/50">Escribiendo... no, es broma.</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] text-emerald-100/80">En línea</span>
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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-lg ${
                      isMe
                        ? 'bg-white/30 backdrop-blur-2xl border border-white/50 text-slate-900 rounded-tr-sm'
                        : 'bg-black/20 backdrop-blur-xl border border-white/10 text-slate-100 rounded-tl-sm'
                    }`}>
                      {!isMe && msg.sender && (
                        <p className="text-[10px] text-emerald-300 font-medium mb-1">{msg.sender.full_name || msg.sender.username}</p>
                      )}
                      <p className={`text-sm ${isMe ? 'font-medium' : 'font-light'} leading-relaxed`}>{msg.content}</p>
                      <p className={`text-[9px] mt-1.5 text-right ${isMe ? 'text-slate-700' : 'text-white/40'}`}>{msgTime}</p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-inner">
                <button className="text-white/50 hover:text-white transition-colors">
                  <Paperclip size={16} />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe un mensaje luminoso..."
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder-white/40 outline-none font-medium"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  className="w-8 h-8 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center text-white hover:bg-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all"
                >
                  <Send size={13} />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm font-medium">
            Selecciona o crea una conversación para empezar.
          </div>
        )}
      </div>
    </div>
  );
}
