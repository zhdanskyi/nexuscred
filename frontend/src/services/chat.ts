import { supabase } from '@/lib/supabase';

export type ProfileLite = {
  id: string;
  full_name: string | null;
  username: string | null;
};

export type ChatMemberRow = {
  user_id: string;
  profiles: ProfileLite | ProfileLite[] | null;
};

export type ConversationMember = {
  user_id: string;
  profiles: ProfileLite | null;
};

export type ConversationRow = {
  id: string;
  name: string | null;
  created_at: string;
  chat_members?: ChatMemberRow[];
};

export type Conversation = {
  id: string;
  name: string | null;
  created_at: string;
  members: ConversationMember[];
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender: ProfileLite | null;
};

function normalizeConversation(row: ConversationRow): Conversation {
  const members =
    (row.chat_members ?? []).map((m) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
    })) ?? [];

  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    members,
  };
}

export async function findProfileByEmailOrUsername(input: string): Promise<ProfileLite | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Supabase Auth email is not in public.profiles by default.
  // We treat "email@domain" as "username=email".
  const username = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;

  const { data, error } = await supabase
    .schema('public')
    .from('profiles')
    .select('id, full_name, username')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getMyConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .schema('public')
    .from('conversations')
    .select('id, name, created_at, chat_members!inner(user_id, profiles(full_name, username, id))')
    .eq('chat_members.user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(normalizeConversation);
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .schema('public')
    .from('conversations')
    .select('id, name, created_at, chat_members(user_id, profiles(full_name, username, id))')
    .eq('id', conversationId)
    .single();

  if (error || !data) return null;
  return normalizeConversation(data);
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .schema('public')
    .from('messages')
    .select('id, sender_id, conversation_id, content, created_at, sender:profiles!messages_sender_id_fkey(id, full_name, username)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as any[]).map((m) => ({
    ...m,
    sender: Array.isArray(m.sender) ? m.sender[0] ?? null : m.sender ?? null,
  })) as ChatMessage[];
}

export async function createConversationAndMembers(params: {
  currentUserId: string;
  otherUserId: string;
  name?: string | null;
}): Promise<{ conversationId: string } | { error: string }> {
  const { currentUserId, otherUserId, name } = params;

  // 1) Create conversation
  const { data: convo, error: convoError } = await supabase
    .schema('public')
    .from('conversations')
    .insert({ name: name ?? 'Chat Privado' })
    .select('id')
    .single();

  if (convoError || !convo?.id) {
    return { error: convoError?.message ?? 'No se pudo crear la conversación.' };
  }

  // 2) Insert TWO chat_members rows (crucial)
  const { error: membersError } = await supabase
    .schema('public')
    .from('chat_members')
    .insert([
      { conversation_id: convo.id, user_id: currentUserId },
      { conversation_id: convo.id, user_id: otherUserId },
    ]);

  if (membersError) {
    return { error: membersError.message };
  }

  return { conversationId: convo.id };
}

