'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, UserPlus, Loader2, MoreVertical, Check, CheckCheck, Users, Trash2, UserRoundPlus, Pencil, Settings, Info, X } from 'lucide-react';
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
  createGroupConversation,
} from '@/services/chat';

function formatLastSeen(updatedAt?: string) {
  if (!updatedAt) return null;
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function isOnline(updatedAt?: string) {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 1000 * 60 * 5; // 5 minutes
}

function AvatarCircle(props: { name?: string | null; avatarUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const size = props.size ?? 'md';
  const px = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const initials =
    (props.name?.trim()?.[0] ?? '#').toUpperCase();

  if (props.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.name ?? 'Avatar'} src={props.avatarUrl} className={`${px} rounded-full object-cover border border-white/10`} />;
  }

  return (
    <div
      className={`${px} rounded-full border border-white/10 flex items-center justify-center text-xs text-white font-medium shrink-0 bg-gradient-to-br from-white/10 to-white/0`}
    >
      {initials}
    </div>
  );
}

export default function TelegramView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState(''); // comma separated
  const [isAdding, setIsAdding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [myProfile, setMyProfile] = useState<{ full_name: string | null; username: string | null; avatar_url?: string | null } | null>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);

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

  // Load current profile for settings UX
  useEffect(() => {
    if (!currentUserId) return;
    const run = async () => {
      const { data, error } = await supabase
        .schema('public')
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', currentUserId)
        .single();
      if (error) {
        console.error('[chat] select profiles(self) failed', error);
        return;
      }
      setMyProfile(data);
    };
    run();
  }, [currentUserId]);

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

  // Realtime: conversations name updates (do not change existing channels)
  useEffect(() => {
    if (!currentUserId) return;

    const convosChannel = supabase
      .channel(`public:conversations_updates:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        async (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;

          // Refresh list so group name updates for all members instantly
          await fetchAllConversations(currentUserId);

          // If active convo updated, hydrate it
          if (activeConvo?.id === updated.id) {
            const refreshed = await getConversation(updated.id);
            if (refreshed) setActiveConvo(refreshed);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convosChannel);
    };
  }, [currentUserId, fetchAllConversations, activeConvo?.id]);

  // Close header menu on outside click / escape
  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-chat-header-menu]')) return;
      setIsHeaderMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHeaderMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isHeaderMenuOpen]);

  // Manejar el cambio manual de conversación para persistirlo
  const handleSelectConvo = async (convo: Conversation) => {
    setActiveConvo(convo);
    localStorage.setItem('nexus_active_chat', convo.id);
    // Hydrate members + group fields for header UX
    const hydrated = await getConversation(convo.id);
    if (hydrated) setActiveConvo(hydrated);
  };

  const headerOtherMember = !activeConvo?.is_group
    ? activeConvo?.members?.find((m) => m.profiles?.id && m.profiles.id !== currentUserId)?.profiles ?? null
    : null;
  const headerTitle =
    activeConvo?.is_group
      ? (activeConvo?.name ?? 'Grupo')
      : (headerOtherMember?.full_name || headerOtherMember?.username || activeConvo?.name || 'Chat');
  const headerSubtitle = activeConvo?.is_group
    ? 'Grupo'
    : (isOnline(headerOtherMember?.updated_at) ? 'En línea' : (formatLastSeen(headerOtherMember?.updated_at) ? `Última conexión: ${formatLastSeen(headerOtherMember?.updated_at)}` : ''));

  const updateMyProfile = async () => {
    if (!currentUserId) return;
    const nextUsername = window.prompt('Tu username', myProfile?.username ?? '');
    if (nextUsername === null) return;
    const nextFullName = window.prompt('Tu nombre', myProfile?.full_name ?? '');
    if (nextFullName === null) return;

    const payload = {
      username: nextUsername.trim() || null,
      full_name: nextFullName.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.schema('public').from('profiles').update(payload).eq('id', currentUserId);
    if (error) {
      console.error('[chat] update profiles(self) failed', error);
      alert(`Error guardando perfil (profiles): ${error.message}`);
      return;
    }

    setMyProfile((prev) => ({ ...(prev ?? { username: null, full_name: null }), ...payload }));
    // Refresh convos so 1:1 titles update instantly
    await fetchAllConversations(currentUserId);
  };

  const renameActiveConversation = async () => {
    if (!activeConvo) return;
    if (isRenaming) return;

    const currentName =
      activeConvo.is_group ? (activeConvo.name ?? 'Nuevo Grupo') : (headerTitle ?? activeConvo.name ?? 'Chat');

    const nextName = window.prompt('Nuevo nombre', currentName);
    if (!nextName?.trim()) return;

    setIsRenaming(true);
    try {
      const { error } = await supabase
        .schema('public')
        .from('conversations')
        .update({ name: nextName.trim() })
        .eq('id', activeConvo.id);

      if (error) {
        console.error('[chat] update conversations(name) failed', error);
        alert(`Error cambiando nombre (conversations): ${error.message}`);
        return;
      }

      const refreshed = await getConversation(activeConvo.id);
      if (refreshed) setActiveConvo(refreshed);
      if (currentUserId) await fetchAllConversations(currentUserId);
    } finally {
      setIsRenaming(false);
    }
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

  // Mark messages as read on conversation entry (recipient_id based)
  useEffect(() => {
    if (!activeConvo || !currentUserId) return;
    const run = async () => {
      const { error } = await supabase
        .schema('public')
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', activeConvo.id)
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);

      if (error) {
        console.error('[chat] update messages(is_read) failed', error);
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          (m as any).recipient_id === currentUserId
            ? { ...m, is_read: true, read_at: m.read_at ?? new Date().toISOString() }
            : m
        )
      );
    };
    run();
  }, [activeConvo?.id, currentUserId]);

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
        // Default: username of recipient for 1:1
        name: userToAdd.username || userToAdd.full_name || 'Chat',
        isGroup: false,
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

  const handleCreateGroup = async () => {
    if (!currentUserId) return;
    const name = groupName.trim() || 'Nuevo Grupo';

    setIsAdding(true);
    try {
      const raw = groupMembers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const ids: string[] = [];
      for (const input of raw) {
        const p = await findProfileByEmailOrUsername(input);
        if (p?.id) ids.push(p.id);
      }

      const created = await createGroupConversation({
        currentUserId,
        groupName: name,
        memberUserIds: ids,
      });

      if ('error' in created) {
        console.error(`[chat] fallo al crear grupo: stage=${created.stage}`, created.error);
        alert(`Error al crear el grupo (${created.stage}): ${created.error}`);
        return;
      }

      await fetchAllConversations(currentUserId);
      const convo = await getConversation(created.conversationId);
      if (convo) await handleSelectConvo(convo);

      setShowCreateGroup(false);
      setGroupName('');
      setGroupMembers('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!activeConvo) return;
    if (!activeConvo.is_group) {
      alert('Esta conversación no es un grupo.');
      return;
    }
    const nextName = window.prompt('Nuevo nombre del grupo', activeConvo.name ?? '');
    if (!nextName?.trim()) return;

    const { error } = await supabase.schema('public').from('conversations').update({ name: nextName.trim() }).eq('id', activeConvo.id);
    if (error) {
      console.error('[chat] update conversations(name) failed', error);
      alert(`Error renombrando grupo (conversations): ${error.message}`);
      return;
    }

    const refreshed = await getConversation(activeConvo.id);
    if (refreshed) setActiveConvo(refreshed);
    if (currentUserId) await fetchAllConversations(currentUserId);
  };

  const handleAddMember = async () => {
    if (!activeConvo) return;
    const input = window.prompt('Email o usuario para añadir');
    if (!input?.trim()) return;

    const profile = await findProfileByEmailOrUsername(input.trim());
    if (!profile) {
      alert('Usuario no encontrado en public.profiles.');
      return;
    }

    const { error } = await supabase.schema('public').from('chat_members').insert({
      conversation_id: activeConvo.id,
      user_id: profile.id,
    });
    if (error) {
      console.error('[chat] insert chat_members(add_member) failed', error);
      alert(`Error añadiendo miembro (chat_members): ${error.message}`);
      return;
    }

    const refreshed = await getConversation(activeConvo.id);
    if (refreshed) setActiveConvo(refreshed);
  };

  const handleDeleteChat = async () => {
    if (!activeConvo) return;
    const ok = window.confirm('¿Eliminar este chat? Esto borrará la conversación completa.');
    if (!ok) return;

    const { error } = await supabase.schema('public').from('conversations').delete().eq('id', activeConvo.id);
    if (error) {
      console.error('[chat] delete conversations failed', error);
      alert(`Error eliminando chat (conversations): ${error.message}`);
      return;
    }

    setActiveConvo(null);
    setMessages([]);
    localStorage.removeItem('nexus_active_chat');
    if (currentUserId) await fetchAllConversations(currentUserId);
  };

  const handleEmptyMessages = async () => {
    if (!activeConvo || !currentUserId) return;
    const ok = window.confirm('¿Vaciar mensajes? Solo se borrarán tus mensajes (por política RLS).');
    if (!ok) return;

    const { error } = await supabase
      .schema('public')
      .from('messages')
      .delete()
      .eq('conversation_id', activeConvo.id)
      .eq('sender_id', currentUserId);

    if (error) {
      console.error('[chat] delete messages failed', error);
      alert(`Error vaciando mensajes (messages): ${error.message}`);
      return;
    }

    setMessages((prev) => prev.filter((m) => m.sender_id !== currentUserId));
  };

  const deleteMessage = async (msg: ChatMessage) => {
    if (!currentUserId) return;
    if (msg.sender_id !== currentUserId) {
      alert('Solo puedes borrar tus propios mensajes.');
      return;
    }
    const ok = window.confirm('¿Borrar este mensaje?');
    if (!ok) return;

    const { error } = await supabase.schema('public').from('messages').delete().eq('id', msg.id);
    if (error) {
      console.error('[chat] delete message failed', error);
      alert(`Error borrando mensaje (messages): ${error.message}`);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  };

  const onMessageContext = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    deleteMessage(msg);
  };

  const onMessageTouchStart = (msg: ChatMessage) => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      deleteMessage(msg);
    }, 550);
  };

  const onMessageTouchEnd = () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Contact List */}
      <div className="hidden md:flex flex-col w-72 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-white/5 relative">
        <div className="p-4 border-b border-white/10 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white truncate">Mensajes</h3>
              <p className="text-[10px] text-white/50 truncate">{myProfile?.username ? `@${myProfile.username}` : (myProfile?.full_name ?? '')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={updateMyProfile}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Ajustes de perfil"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => {
                setShowCreateGroup(!showCreateGroup);
                setShowAddForm(false);
              }}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Crear Nuevo Grupo"
            >
              <Users size={16} />
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowCreateGroup(false);
              }}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Nuevo chat"
            >
              <UserPlus size={16} />
            </button>
          </div>
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

        <AnimatePresence>
          {showCreateGroup && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 py-3 bg-white/5 border-b border-white/10 z-0 overflow-hidden"
            >
              <input
                type="text"
                placeholder="Nombre del grupo..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-black/40 text-white placeholder-zinc-500 text-xs px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Miembros (emails/usuarios, separados por coma)"
                value={groupMembers}
                onChange={(e) => setGroupMembers(e.target.value)}
                className="w-full mt-2 bg-black/40 text-white placeholder-zinc-500 text-xs px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-white/20"
              />
              <GlassButton size="sm" className="w-full mt-2" onClick={handleCreateGroup} loading={isAdding}>
                Crear Grupo
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
                const other = !c.is_group
                  ? c.members?.find((m) => m.profiles?.id && m.profiles.id !== currentUserId)?.profiles ?? null
                  : null;
                const displayName = c.is_group
                  ? (c.name ?? 'Grupo')
                  : (other?.full_name || other?.username || c.name || 'Chat');
                
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
                    <AvatarCircle
                      size="md"
                      name={displayName}
                      avatarUrl={c.is_group ? (c.group_avatar ?? null) : (other?.avatar_url ?? null)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium truncate">{displayName}</span>
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
      <div className="flex-1 flex flex-col bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-white/5 relative">
        {isInitializing ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
          </div>
        ) : activeConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/5 backdrop-blur-3xl relative">
              <AvatarCircle
                size="lg"
                name={headerTitle}
                avatarUrl={activeConvo.is_group ? (activeConvo.group_avatar ?? null) : (headerOtherMember?.avatar_url ?? null)}
              />
              <div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={renameActiveConversation}
                    className="text-sm text-white font-medium hover:text-white/90 transition-colors text-left max-w-[40vw] truncate"
                    title="Editar nombre"
                  >
                    {headerTitle}
                  </button>
                  <button
                    onClick={renameActiveConversation}
                    className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                    title="Renombrar"
                    disabled={isRenaming}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setIsMembersOpen(true)}
                    className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                    title="Información"
                  >
                    <Info size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400">{headerSubtitle || ' '}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {!activeConvo.is_group && isOnline(headerOtherMember?.updated_at) && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
                )}
                <button
                  onClick={() => setIsHeaderMenuOpen((v) => !v)}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                  title="Opciones"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {isHeaderMenuOpen && (
                <div
                  data-chat-header-menu
                  className="absolute right-4 top-16 w-56 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl shadow-white/5 overflow-hidden z-20"
                >
                  <button
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleRenameGroup();
                    }}
                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!activeConvo.is_group}
                  >
                    <Pencil size={14} className="text-white/70" />
                    Cambiar nombre de grupo
                  </button>
                  <button
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleAddMember();
                    }}
                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 flex items-center gap-2"
                  >
                    <UserRoundPlus size={14} className="text-white/70" />
                    Añadir miembro
                  </button>
                  <button
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleDeleteChat();
                    }}
                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 flex items-center gap-2"
                  >
                    <Trash2 size={14} className="text-white/70" />
                    Eliminar Chat
                  </button>
                  <button
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleEmptyMessages();
                    }}
                    className="w-full px-4 py-3 text-left text-xs text-white hover:bg-white/5 flex items-center gap-2"
                  >
                    <Trash2 size={14} className="text-white/70" />
                    Vaciar mensajes
                  </button>
                </div>
              )}
            </div>

            {/* Members panel */}
            <AnimatePresence>
              {isMembersOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30"
                >
                  <div
                    className="absolute inset-0 bg-black/60"
                    onClick={() => setIsMembersOpen(false)}
                  />
                  <motion.div
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 40, opacity: 0 }}
                    className="absolute right-4 top-4 bottom-4 w-[22rem] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-white/5 overflow-hidden flex flex-col"
                  >
                    <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">Miembros</p>
                        <p className="text-[10px] text-white/50 truncate">{activeConvo.is_group ? 'Grupo' : 'Chat 1:1'}</p>
                      </div>
                      <button
                        onClick={() => setIsMembersOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                        title="Cerrar"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {activeConvo.members?.map((m) => (
                        <div
                          key={`${activeConvo.id}:${m.user_id}`}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                        >
                          <AvatarCircle
                            size="sm"
                            name={m.profiles?.full_name || m.profiles?.username || 'U'}
                            avatarUrl={m.profiles?.avatar_url ?? null}
                          />
                          <div className="min-w-0">
                            <p className="text-xs text-white font-medium truncate">{m.profiles?.full_name || m.profiles?.username || 'Usuario'}</p>
                            <p className="text-[10px] text-white/50 truncate">{m.profiles?.username ? `@${m.profiles.username}` : ''}</p>
                          </div>
                          {m.user_id === currentUserId && (
                            <span className="ml-auto text-[10px] text-emerald-400/80">Tú</span>
                          )}
                        </div>
                      ))}

                      {(!activeConvo.members || activeConvo.members.length === 0) && (
                        <div className="text-center text-xs text-white/50 py-6">Cargando miembros...</div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
                const msgTime = new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const showRead = Boolean(msg.is_read);
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    onContextMenu={(e) => onMessageContext(e, msg)}
                    onTouchStart={() => onMessageTouchStart(msg)}
                    onTouchEnd={onMessageTouchEnd}
                    onTouchCancel={onMessageTouchEnd}
                  >
                    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <AvatarCircle
                          size="sm"
                          name={msg.sender?.full_name || msg.sender?.username || 'U'}
                          avatarUrl={msg.sender?.avatar_url ?? null}
                        />
                      )}

                      <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-lg ${
                        isMe
                          ? 'bg-white/10 backdrop-blur-2xl border border-white/10 text-white rounded-tr-sm'
                          : 'bg-black/60 backdrop-blur-2xl border border-white/5 text-zinc-100 rounded-tl-sm'
                      }`}>
                        {!isMe && msg.sender && (
                          <p className="text-[10px] text-white/70 font-medium mb-1">{msg.sender.full_name || msg.sender.username}</p>
                        )}
                        <p className={`text-sm ${isMe ? 'font-medium' : 'font-light'} leading-relaxed break-words`}>{msg.content}</p>

                        <div className={`mt-1.5 flex items-center gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${isMe ? 'text-white/60' : 'text-white/50'}`}>{msgTime}</span>
                          {isMe && (
                            <span className="inline-flex items-center">
                              {showRead ? (
                                <CheckCheck size={14} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
                              ) : (
                                <Check size={14} className="text-white/40" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
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
