import { supabase } from '@/lib/supabase';

export type ProfileLite = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  updated_at?: string;
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
  is_group?: boolean | null;
  group_avatar?: string | null;
  created_at: string;
  chat_members?: ChatMemberRow[];
};

export type Conversation = {
  id: string;
  name: string | null;
  is_group?: boolean | null;
  group_avatar?: string | null;
  created_at: string;
  members: ConversationMember[];
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id?: string | null;
  conversation_id: string;
  content: string;
  is_read?: boolean;
  read_at?: string | null;
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
    is_group: row.is_group ?? false,
    group_avatar: row.group_avatar ?? null,
    created_at: row.created_at,
    members,
  };
}

export async function findProfileByEmailOrUsername(input: string): Promise<ProfileLite | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1) Try real email lookup if your profiles table has email column.
  if (trimmed.includes('@')) {
    const { data, error } = await supabase
      .schema('public')
      .from('profiles')
      .select('id, full_name, username')
      .eq('email', trimmed)
      .single();

    if (!error && data) return data;
    console.warn('[chat] profiles lookup by email failed or not found', { email: trimmed, error });
  }

  // 2) Fallback to username lookup (common case in this repo schema)
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
  // Load from chat_members (anti-borrado + matches SQL requirement)
  const { data, error } = await supabase
    .schema('public')
    .from('chat_members')
    .select(
      // Use explicit FK name to make PostgREST relationship resolution deterministic
      'conversation:conversations!chat_members_conversation_id_fkey(id, name, is_group, group_avatar, created_at)'
    )
    .eq('user_id', userId);

  if (error) {
    console.error('[chat] select chat_members->conversations failed', error);
    return [];
  }
  if (!data) return [];

  const convos = (data as any[])
    .map((row) => row.conversation)
    .filter(Boolean) as ConversationRow[];

  // Local sort by created_at desc (since we query members table)
  convos.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  // Fetch members for these conversations in one go (for smart 1:1 titles)
  const convoIds = convos.map((c) => c.id);
  const { data: membersData, error: membersError } = await supabase
    .schema('public')
    .from('chat_members')
    .select('conversation_id, user_id, profiles(id, full_name, username, avatar_url, updated_at)')
    .in('conversation_id', convoIds);

  if (membersError) {
    console.error('[chat] select chat_members(members) failed', membersError);
    return convos.map((c) => normalizeConversation({ ...c, chat_members: [] }));
  }

  const membersByConvo = new Map<string, ChatMemberRow[]>();
  for (const row of (membersData ?? []) as any[]) {
    const list = membersByConvo.get(row.conversation_id) ?? [];
    list.push({ user_id: row.user_id, profiles: row.profiles ?? null });
    membersByConvo.set(row.conversation_id, list);
  }

  return convos.map((c) =>
    normalizeConversation({
      ...c,
      chat_members: membersByConvo.get(c.id) ?? [],
    })
  );
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .schema('public')
    .from('conversations')
    .select(
      'id, name, is_group, group_avatar, created_at, chat_members(user_id, profiles(full_name, username, id, avatar_url, updated_at))'
    )
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('[chat] select conversations failed', error);
    return null;
  }
  if (!data) return null;
  return normalizeConversation(data);
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .schema('public')
    .from('messages')
    .select(
      'id, sender_id, conversation_id, content, is_read, read_at, created_at, sender:profiles!messages_sender_id_fkey(id, full_name, username, avatar_url, updated_at)'
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[chat] select messages failed', error);
    return [];
  }
  if (!data) return [];
  return (data as any[]).map((m) => ({
    ...m,
    sender: Array.isArray(m.sender) ? m.sender[0] ?? null : m.sender ?? null,
  })) as ChatMessage[];
}

export async function createConversationAndMembers(params: {
  currentUserId: string;
  otherUserId: string;
  name?: string | null;
  isGroup?: boolean;
  groupAvatar?: string | null;
}): Promise<
  | { conversationId: string }
  | { error: string; stage: 'conversations' | 'chat_members:self' | 'chat_members:friend' }
> {
  const { currentUserId, otherUserId, name, isGroup, groupAvatar } = params;

  // 1) INSERT conversations (atomic step 1)
  const { data: convo, error: convoError } = await supabase
    .schema('public')
    .from('conversations')
    .insert({
      name: name ?? 'Chat Privado',
      is_group: isGroup ?? false,
      group_avatar: groupAvatar ?? null,
    })
    .select('id')
    .single();

  if (convoError || !convo?.id) {
    console.error('[chat] insert conversations failed', convoError);
    return {
      error: convoError?.message ?? 'No se pudo crear la conversación.',
      stage: 'conversations',
    };
  }

  // 2) INSERT chat_members for self (atomic step 2)
  const { error: selfMemberError } = await supabase
    .schema('public')
    .from('chat_members')
    .insert({ conversation_id: convo.id, user_id: currentUserId });

  if (selfMemberError) {
    console.error('[chat] insert chat_members(self) failed', selfMemberError);
    return { error: selfMemberError.message, stage: 'chat_members:self' };
  }

  // 3) INSERT chat_members for friend (atomic step 3)
  const { error: friendMemberError } = await supabase
    .schema('public')
    .from('chat_members')
    .insert({ conversation_id: convo.id, user_id: otherUserId });

  if (friendMemberError) {
    console.error('[chat] insert chat_members(friend) failed', friendMemberError);
    return { error: friendMemberError.message, stage: 'chat_members:friend' };
  }

  return { conversationId: convo.id };
}

export async function createGroupConversation(params: {
  currentUserId: string;
  groupName: string;
  memberUserIds: string[];
  groupAvatar?: string | null;
}): Promise<
  | { conversationId: string }
  | { error: string; stage: 'conversations' | 'chat_members:self' | 'chat_members:members' }
> {
  const { currentUserId, groupName, memberUserIds, groupAvatar } = params;

  const { data: convo, error: convoError } = await supabase
    .schema('public')
    .from('conversations')
    .insert({
      name: groupName,
      is_group: true,
      group_avatar: groupAvatar ?? null,
    })
    .select('id')
    .single();

  if (convoError || !convo?.id) {
    console.error('[chat] insert group conversations failed', convoError);
    return { error: convoError?.message ?? 'No se pudo crear el grupo.', stage: 'conversations' };
  }

  const { error: selfMemberError } = await supabase
    .schema('public')
    .from('chat_members')
    .insert({ conversation_id: convo.id, user_id: currentUserId });

  if (selfMemberError) {
    console.error('[chat] insert group chat_members(self) failed', selfMemberError);
    return { error: selfMemberError.message, stage: 'chat_members:self' };
  }

  const uniqueMemberIds = Array.from(new Set(memberUserIds.filter(Boolean))).filter((id) => id !== currentUserId);
  if (uniqueMemberIds.length === 0) return { conversationId: convo.id };

  const rows = uniqueMemberIds.map((id) => ({ conversation_id: convo.id, user_id: id }));
  const { error: membersError } = await supabase.schema('public').from('chat_members').insert(rows);
  if (membersError) {
    console.error('[chat] insert group chat_members(members) failed', membersError);
    return { error: membersError.message, stage: 'chat_members:members' };
  }

  return { conversationId: convo.id };
}

