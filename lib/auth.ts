import { supabase } from "./supabase"

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) {
    console.error("Error signing in:", error)
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error("Error signing out:", error)
    throw error
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    console.error("Error getting user:", error)
    return null
  }
  return user
}

export function generateVSCodeDeepLink(token: string) {
  const encodedToken = encodeURIComponent(token)
  return `vscode://nikayel.MockMate/auth-callback?token=${encodedToken}`
}
