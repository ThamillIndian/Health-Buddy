import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Custom hook to fetch the database user ID from Supabase auth user
 * This converts auth_id to the database user.id
 */
export function useUserId() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!user) {
        setLoading(false);
        setUserId(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch the database user ID using auth_id
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          setUserId(data.id);
        } else {
          setUserId(null);
        }
      } catch (err) {
        console.error('Error fetching user ID:', err);
        setError(err as Error);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, [user]);

  return { userId, loading, error };
}
