// src/api/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// As variáveis de ambiente são strings
const supabaseUrl: string = 'https://drprfuinwglmzquqtqzq.supabase.co';
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycHJmdWlud2dsbXpxdXF0cXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTMyMzksImV4cCI6MjA2OTI2OTIzOX0.H2bhXrPMLxkfbvkyR6V5oPImd-RP-4dT2uBQLrbgVVc';

// Exportamos o cliente Supabase, garantindo que ele tenha o tipo SupabaseClient
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
