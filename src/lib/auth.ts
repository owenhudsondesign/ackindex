import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Sign in with email and password
 */
export async function signIn(credentials: SignInCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get the current user (secure server-side authentication)
 */
export async function getSession() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user ? { user } : null;
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || '',
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  emailUpdates?: boolean;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(data: SignUpData) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/`,
      data: {
        full_name: data.fullName || '',
        email_updates: data.emailUpdates || false,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Create user profile after successful signup
  if (authData.user) {
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          full_name: data.fullName || null,
          email_updates_enabled: data.emailUpdates || false,
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Don't throw - user is created, profile creation is secondary
      }
    } catch (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't throw - user is created, profile creation is secondary
    }
  }

  return authData;
}

/**
 * Resend confirmation email
 */
export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Reset password request
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}
