// ═══════════════════════════════════════════════════════════
//  NexusCred — Backend API Structure
//  Edge Functions & Middleware
// ═══════════════════════════════════════════════════════════

// This directory contains server-side logic:
//
// /middleware    - Auth middleware, rate limiting, CORS
// /functions    - Edge functions for credential operations
// /utils        - Shared server utilities
//
// Currently, the frontend uses Supabase directly for:
// - Authentication (supabase.auth)
// - Database queries (supabase.from())
// - Real-time subscriptions (supabase.channel())
//
// Future backend endpoints:
// - POST /api/credentials/issue  → Issue new credential with SHA-256 hash
// - POST /api/credentials/verify → Verify credential against ledger
// - POST /api/credentials/revoke → Revoke credential (admin only)
// - GET  /api/audit/stream       → SSE stream for real-time audit logs

export {};
