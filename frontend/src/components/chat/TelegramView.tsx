'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Funciones de fetch extraídas para reusabilidad
  const fetchSingleConversation = async (convoId: string) => {
    const { data: convo } = await supabase
      .schema('public')
      .from('conversations')
      .select('*, chat_members(user_id, profiles!inner(full_name, username))')
      .eq('id', convoId)
      .single();
    return convo;
  };

  const fetchAllConversations = useCallback(async (userId: string) => {
    const { data: members } = await supabase
      .schema('public')
      .from('chat_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (members && members.length > 0) {
      const convoIds = members.map(m => m.conversation_id);
      const { data: convos } = await supabase
        .schema('public')
        .from('conversations')
        .select('*, chat_members(user_id, profiles!inner(full_name, username))')
        .in('id', convoIds)
        .order('created_at', { ascending: false });
      
      if (convos) {
        setConversations(convos);
        
        // Restaurar estado de sesión (persistencia entre pestañas)
        const savedConvoId = localStorage.getItem('nexus_active_chat');
        if (savedConvoId) {
          const found = convos.find(c => c.id === savedConvoId);
          if (found) {
            setActiveConvo(found);
            return;
          }
        }
        
        // Fallback al primero
        setActiveConvo(convos[0]);
      }
    }
  }, []);

  // Inicialización y Realtime de Nuevas Conversaciones
  useEffect(() => {
    let userId = '';
    
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      userId = session.user.id;
      setCurrentUserId(userId);
      await fetchAllConversations(userId);
    };

    init();

    // Escuchar si alguien nos añade a una nueva conversación en chat_members
    const membersChannel = supabase
      .channel('chat_members_inserts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_members'
      }, async (payload) => {
        if (payload.new.user_id === userId) {
          const newConvo = await fetchSingleConversation(payload.new.conversation_id);
          if (newConvo) {
            setConversations(prev => {
              if (prev.find(c => c.id === newConvo.id)) return prev;
              return [newConvo, ...prev];
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
    };
  }, [fetchAllConversations]);

  // Manejar el cambio manual de conversación para guardar el estado
  const handleSelectConvo = (convo: Conversation) => {
    setActiveConvo(convo);
    localStorage.setItem('nexus_active_chat', convo.id);
  };

  // Fetch y Realtime de Mensajes del Chat Activo
  useEffect(() => {
    if (!activeConvo) return;
    
    let isMounted = true;
    
    const fetchMsgs = async () => {
      const { data } = await supabase
        .schema('public')
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, username)')
        .eq('conversation_id', activeConvo.id)
        .order('created_at', { ascending: true });
      
      if (isMounted && data) {
        setMessages(data);
      }
    };
    
    fetchMsgs();

    const channel = supabase
      .channel(`room:${activeConvo.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${activeConvo.id}`
      }, async (payload) => {
        const { data: profile } = await supabase
          .schema('public')
          .from('profiles')
          .select('full_name, username')
          .eq('id', payload.new.sender_id)
          .single();
        
        const newMsg = { ...payload.new, sender: profile } as ChatMessage;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !activeConvo) return;
    const text = messageText;
    setMessageText(''); 
    
    await supabase.schema('public').from('messages').insert({
      sender_id: currentUserId,
      conversation_id: activeConvo.id,
      content: text
    });
  };

  const startChat = async () => {
    if (!searchUsername.trim()) return;
    setIsAdding(true);
    try {
      const targetUsername = searchUsername.split('@')[0];
      
      const { data: userToAdd, error: userError } = await supabase
        .schema('public')
        .from('profiles')
        .select('id, full_name, username')
        .eq('username', targetUsername)
        .single();
      
      if (userError || !userToAdd) {
        console.error('Usuario no encontrado en public.profiles:', userError);
        alert('Usuario no encontrado en la base de datos.');
        setIsAdding(false);
        return;
      }

      // 1. Crear conversacion
      const { data: convo, error: convoError } = await supabase
        .schema('public')
        .from('conversations')
        .insert({ name: `Chat Privado` })
        .select().single();

      if (convoError || !convo) {
        console.error('Error al crear conversación:', convoError);
        alert(`Error al crear la conversación: ${convoError?.message}`);
        setIsAdding(false);
        return;
      }

      // 2. Insert doble EXPLÍCITO en chat_members (remitente y destinatario) en una sola secuencia
      const { error: membersError } = await supabase
        .schema('public')
        .from('chat_members')
        .insert([
          { conversation_id: convo.id, user_id: currentUserId },
          { conversation_id: convo.id, user_id: userToAdd.id }
        ]);

      if (membersError) {
        console.error('Error al añadir miembros:', membersError);
        alert(`Error al añadir miembros: ${membersError.message}`);
        setIsAdding(false);
        return;
      }

      // 3. Forzar recarga completa para asegurar datos fiables en el frontend y actualizar UI
      await fetchAllConversations(currentUserId);
      
      const newConvo = await fetchSingleConversation(convo.id);
      if (newConvo) {
        handleSelectConvo(newConvo); // Set active and save to localStorage
      }
      
      setShowAddForm(false);
      setSearchUsername('');
    } catch (err) {
      console.error('Error general en startChat:', err);
    }
    setIsAdding(false);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Contact List */}
      <div className="hidden md:flex flex-col w-72 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-white/5">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-sm font-medium text-white">Mensajes</h3>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-zinc-400 hover:text-white transition-colors">
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
              className="w-full bg-black/40 text-white placeholder-zinc-500 text-xs px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-white/20"
            />
            <GlassButton size="sm" className="w-full mt-2" onClick={startChat} loading={isAdding}>
              Crear Chat
            </GlassButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c, i) => {
            const otherMember = c.members?.find((m: any) => m.profiles?.id !== currentUserId)?.profiles || c.members?.[0]?.profiles || { full_name: 'Chat', username: 'C' };
            const initials = (otherMember.full_name || otherMember.username || 'C').substring(0, 2).toUpperCase();
            
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelectConvo(c)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-300 ${
                  activeConvo?.id === c.id ? 'bg-white/10 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.03)]' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-xs text-white font-medium shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium truncate">{c.name === 'Chat Privado' ? (otherMember.full_name || otherMember.username) : c.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">Ver conversación</p>
                </div>
              </motion.button>
            );
          })}
          {conversations.length === 0 && !showAddForm && (
            <div className="p-4 text-center text-zinc-500 text-xs">
              No tienes conversaciones. Haz clic en el botón + para empezar.
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-white/5">
        {activeConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/5">
              <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-xs text-white font-medium">
                #
              </div>
              <div>
                <p className="text-sm text-white font-medium">
                  {activeConvo.name === 'Chat Privado' 
                    ? (activeConvo.members.find((m:any) => m.profiles?.id !== currentUserId)?.profiles?.full_name || 'Chat Privado')
                    : activeConvo.name}
                </p>
                <p className="text-[10px] text-zinc-400">En línea</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
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
                        ? 'bg-white/10 backdrop-blur-2xl border border-white/10 text-white rounded-tr-sm'
                        : 'bg-black/60 backdrop-blur-xl border border-white/5 text-zinc-300 rounded-tl-sm'
                    }`}>
                      {!isMe && msg.sender && (
                        <p className="text-[10px] text-zinc-400 font-medium mb-1">{msg.sender.full_name || msg.sender.username}</p>
                      )}
                      <p className={`text-sm ${isMe ? 'font-medium' : 'font-light'} leading-relaxed`}>{msg.content}</p>
                      <p className={`text-[9px] mt-1.5 text-right ${isMe ? 'text-zinc-400' : 'text-zinc-500'}`}>{msgTime}</p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-inner">
                <button className="text-zinc-500 hover:text-white transition-colors">
                  <Paperclip size={16} />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-medium"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all"
                >
                  <Send size={13} />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm font-medium">
            Selecciona o crea una conversación para empezar.
          </div>
        )}
      </div>
    </div>
  );
}
