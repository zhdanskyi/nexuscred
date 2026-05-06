'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import GlassButton from '@/components/ui/GlassButton';
import {
  type Conversation,
  type ChatMessage,
  findProfileByEmailOrUsername,
  getConversation,
  getConversationMessages,
  getMyConversations,
  createConversationAndMembers,
} from '@/services/chat';

export default function TelegramView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchAllConversations = useCallback(async (userId: string) => {
    setIsLoadingConversations(true);
    try {
      const convos = await getMyConversations(userId);
      console.log('[chat] loaded conversations', { userId, count: convos.length });
      setConversations(convos);

      if (convos.length === 0) {
        setActiveConvo(null);
        return;
      }

      // Persistencia: intentar restaurar la última conversación
      const savedConvoId = localStorage.getItem('nexus_active_chat');
      if (savedConvoId) {
        const found = convos.find(c => c.id === savedConvoId);
        if (found) {
          setActiveConvo(found);
          return;
        }
      }

      setActiveConvo(convos[0]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Inicialización (anti-borrado): siempre recarga desde Supabase al montar
  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const uid = session.user.id;
        setCurrentUserId(uid);
        await fetchAllConversations(uid);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [fetchAllConversations]);

  // Anti-borrado extra: al volver a enfocarse (cambio de pestañas internas / focus)
  useEffect(() => {
    if (!currentUserId) return;

    const refresh = () => fetchAllConversations(currentUserId);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUserId, fetchAllConversations]);

  // Realtime total: chat_members (para que aparezcan nuevos chats sin refrescar)
  useEffect(() => {
    if (!currentUserId) return;

    const membersChannel = supabase
      .channel(`public:chat_members:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const convoId = (payload.new as any)?.conversation_id ?? (payload.old as any)?.conversation_id;
          if (!convoId) return;

          const convo = await getConversation(convoId);
          if (!convo) return;

          setConversations(prev => {
            const exists = prev.some(c => c.id === convo.id);
            const next = exists ? prev.map(c => (c.id === convo.id ? convo : c)) : [convo, ...prev];
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
    };
  }, [currentUserId]);

  // Manejar el cambio manual de conversación para persistirlo
  const handleSelectConvo = (convo: Conversation) => {
    setActiveConvo(convo);
    localStorage.setItem('nexus_active_chat', convo.id);
  };

  // Fetch y Realtime de Mensajes del Chat Activo
  useEffect(() => {
    if (!activeConvo) return;
    
    let isMounted = true;
    
    const fetchMsgs = async () => {
      setIsLoadingMessages(true);
      try {
        const data = await getConversationMessages(activeConvo.id);
        if (isMounted) setMessages(data);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    };
    
    fetchMsgs();

    const messagesChannel = supabase
      .channel(`public:messages:${activeConvo.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${activeConvo.id}`
      }, async (payload) => {
        // Evitar fugas: el servidor/RLS controla el acceso; aquí solo hidrata sender para UI.
        const msg = payload.new as any;
        const { data: profile } = await supabase
          .schema('public')
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', msg.sender_id)
          .single();

        const newMsg = { ...msg, sender: profile ?? null } as ChatMessage;
        setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(messagesChannel);
    };
  }, [activeConvo]);

  // Auto-scroll al recibir mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !activeConvo || !currentUserId) return;
    const text = messageText;
    setMessageText(''); 
    
    const { error } = await supabase.schema('public').from('messages').insert({
      sender_id: currentUserId,
      conversation_id: activeConvo.id,
      content: text
    });
    if (error) {
      console.error('[chat] insert messages failed', error);
      alert(`Error enviando mensaje (messages): ${error.message}`);
    }
  };

  const startChat = async () => {
    if (!searchUsername.trim()) return;
    setIsAdding(true);
    try {
      // 1) Buscar el id del destinatario en public.profiles (crucial)
      const userToAdd = await findProfileByEmailOrUsername(searchUsername);
      if (!userToAdd) {
        alert('Usuario no encontrado en public.profiles.');
        setIsAdding(false);
        return;
      }

      if (!currentUserId) {
        alert('Sesión no disponible. Vuelve a iniciar sesión.');
        setIsAdding(false);
        return;
      }

      // 2) Crear entrada en public.conversations (crucial)
      // 3) Insertar DOS filas en public.chat_members usando el id de conversación (crucial)
      const created = await createConversationAndMembers({
        currentUserId,
        otherUserId: userToAdd.id,
        name: 'Chat Privado',
      });

      if ('error' in created) {
        console.error(`[chat] fallo al crear: stage=${created.stage}`, created.error);
        alert(`Error al crear el chat (${created.stage}): ${created.error}`);
        return;
      }

      // 4) Forzar recarga desde la base de datos para sincronizar el estado
      await fetchAllConversations(currentUserId);
      
      const newConvo = await getConversation(created.conversationId);
      if (newConvo) {
        handleSelectConvo(newConvo);
      }
      
      setShowAddForm(false);
      setSearchUsername('');
    } catch (err) {
      console.error('Error crítico en startChat:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Contact List */}
      <div className="hidden md:flex flex-col w-72 bg-black backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-white/5 relative">
        <div className="p-4 border-b border-white/10 flex justify-between items-center z-10">
          <h3 className="text-sm font-medium text-white">Mensajes</h3>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-zinc-400 hover:text-white transition-colors">
            <UserPlus size={16} />
          </button>
        </div>
        
        <AnimatePresence>
          {showAddForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 py-3 bg-white/5 border-b border-white/10 z-0 overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 relative">
          {isInitializing || isLoadingConversations ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 size={20} className="animate-spin text-zinc-400" />
              <span className="text-xs font-medium tracking-wide">Cargando chats...</span>
            </div>
          ) : (
            <>
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
                  No tienes conversaciones activas. <br/>Haz clic en + para empezar.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-black backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-white/5 relative">
        {isInitializing ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
          </div>
        ) : activeConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/5 backdrop-blur-2xl">
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
              {isLoadingMessages ? (
                <div className="h-full flex items-center justify-center text-zinc-500 gap-2">
                  <Loader2 size={18} className="animate-spin text-zinc-400" />
                  <span className="text-xs font-medium tracking-wide">Cargando mensajes...</span>
                </div>
              ) : (
                messages.map((msg, i) => {
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
                      <p className={`text-sm ${isMe ? 'font-medium' : 'font-light'} leading-relaxed break-words`}>{msg.content}</p>
                      <p className={`text-[9px] mt-1.5 text-right ${isMe ? 'text-zinc-400' : 'text-zinc-500'}`}>{msgTime}</p>
                    </div>
                  </motion.div>
                );
              })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-3 shadow-inner">
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
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <span className="text-sm font-medium tracking-wide">Ninguna conversación seleccionada</span>
            <span className="text-xs text-zinc-600">Inicia un chat desde el panel izquierdo</span>
          </div>
        )}
      </div>
    </div>
  );
}
