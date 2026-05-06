import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader || '' } }
  });

  const { data, error } = await supabase
    .from('credentials')
    .select('*, profiles!credentials_worker_id_fkey(full_name, username)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader || '' } }
  });

  try {
    const body = await request.json();
    const { title, description, worker_name, proof_hash, metadata } = body;

    // Get current user to be the issuer
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Attempt to find worker by full_name or username
    let worker_id = null;
    if (worker_name) {
      const { data: workerProfile } = await supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${worker_name}%,username.ilike.%${worker_name}%`)
        .limit(1)
        .single();
      
      if (workerProfile) {
        worker_id = workerProfile.id;
      }
    }

    const { data, error } = await supabase.from('credentials').insert({
      issuer_id: user.id,
      worker_id: worker_id,
      title,
      description,
      proof_hash,
      metadata: metadata || { worker_name_fallback: worker_name }
    }).select().single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
