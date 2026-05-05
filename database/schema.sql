-- ═══════════════════════════════════════════════════════════
--  NexusCred — Database Schema (Supabase PostgreSQL)
-- ═══════════════════════════════════════════════════════════

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Perfiles (Extensión de Auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('company', 'freelancer')) DEFAULT 'freelancer',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Credenciales (Simulación de Proofs Criptográficos)
CREATE TABLE credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  issuer_id UUID REFERENCES profiles(id),
  worker_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  proof_hash TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Mensajería (Estilo Telegram)
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ───────────────────────────────────────────

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Credentials: issuer and worker can view their own
CREATE POLICY "Users can view own credentials"
  ON credentials FOR SELECT
  USING (issuer_id = auth.uid() OR worker_id = auth.uid());

CREATE POLICY "Companies can issue credentials"
  ON credentials FOR INSERT
  WITH CHECK (issuer_id = auth.uid());

-- Messages: sender and recipient can view
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid());
