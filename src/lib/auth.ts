import { createClient } from '@/lib/supabase/client'

export interface ProfileData {
  first_name: string
  last_name: string
  cell?: string
  birth_city?: string
  birth_state?: string
  birth_country?: string
  birth_date?: string
  birth_time?: string
  current_city?: string
  current_state?: string
  current_country?: string
}

export async function signUp(email: string, password: string, profileData: ProfileData) {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError) throw authError
  if (!authData.user) throw new Error('Registration failed')

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email,
    ...profileData,
  })
  if (profileError) throw profileError

  return authData.user
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
