-- NexusCred — Realtime Chat Schema Update
-- ═══════════════════════════════════════════════════════════

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create chat_members table
CREATE TABLE IF NOT EXISTS chat_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 3. Update messages table to link to conversation instead of direct recipient
-- We add conversation_id. We keep recipient_id nullable for backward compatibility or direct P2P.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- 4. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for conversations
CREATE POLICY "Users can view their conversations" 
  ON conversations FOR SELECT 
  USING (EXISTS (SELECT 1 FROM chat_members WHERE conversation_id = conversations.id AND user_id = auth.uid()));

CREATE POLICY "Users can create conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (true);

-- 6. RLS Policies for chat_members
CREATE POLICY "Users can view members of their convos" 
  ON chat_members FOR SELECT 
  USING (EXISTS (SELECT 1 FROM chat_members cm WHERE cm.conversation_id = chat_members.conversation_id AND cm.user_id = auth.uid()));

CREATE POLICY "Users can join convos" 
  ON chat_members FOR INSERT 
  WITH CHECK (true);

-- 7. Update messages RLS
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" 
  ON messages FOR SELECT 
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM chat_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );
