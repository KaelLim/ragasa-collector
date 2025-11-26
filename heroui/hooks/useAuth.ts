import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database.types'

/**
 * IøÜÍ\ Hook
 */
export function useAuth() {
  /**
   * Email {e
   */
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  /**
   * {ú
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  /**
   * Ö—vM(6Òr
   */
  const getUserRole = async (): Promise<UserRole | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    return (user?.user_metadata?.role as UserRole) ?? null
  }

  /**
   * Ö—vM(6ß6 ID
   */
  const getTenantId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.user_metadata?.tenant_id ?? null
  }

  /**
   * Ö— Access Token|ë Edge Functions (	
   */
  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  /**
   * (6;Šå_(	
   */
  const signUp = async (
    email: string,
    password: string,
    metadata?: { name?: string; role?: UserRole; tenant_id?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata?.name || '',
          role: metadata?.role || 'user',
          tenant_id: metadata?.tenant_id || '00000000-0000-0000-0000-000000000000'
        }
      }
    })

    if (error) throw error
    return data
  }

  return {
    signInWithEmail,
    signOut,
    getUserRole,
    getTenantId,
    getAccessToken,
    signUp
  }
}
