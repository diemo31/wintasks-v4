import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxqjhqkmzhrreysvdycl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cWpocWttemhycmV5c3ZkeWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzIzNDYsImV4cCI6MjA5ODU0ODM0Nn0.IRZj4rbqxWXZub2ac_wnvtShNgrd7hCu5jyd5d6mPog';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
