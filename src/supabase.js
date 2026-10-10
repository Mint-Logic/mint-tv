import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oofkedpuluvsklndijvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZmtlZHB1bHV2c2tsbmRpanZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1OTYzNDEsImV4cCI6MjEwNzE3MjM0MX0.md4zZW4LKByIIJJWaM5UdquVO_AptHP9pv428u8fCz0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);