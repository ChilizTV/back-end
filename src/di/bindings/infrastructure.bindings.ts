import { container } from 'tsyringe';
import { supabaseClient } from '../../infrastructure/database/supabase/client';

container.register('SupabaseClient', {
  useValue: supabaseClient,
});
