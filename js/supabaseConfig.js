// ══════════════════════════════════════
//  supabase.js — configuración compartida
//  Reemplazá los valores con los tuyos
// ══════════════════════════════════════

const SUPABASE_URL = 'https://utwhnigqirndmhndxefs.supabase.co';  // https://xxxxxxxx.supabase.co
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2huaWdxaXJuZG1obmR4ZWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjI4MzAsImV4cCI6MjA5Nzk5ODgzMH0.O4R6rqVjyM5qAZepF_tDdsgIZP24rpHlQ-qM5zHAEbc';  // anon public key

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);