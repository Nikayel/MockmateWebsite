import { User } from "firebase/auth"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AdminAction {
  action: string
  [key: string]: any
}

export async function executeAdminAction<T>(
  firebaseUser: User | null,
  endpoint: string,
  action: AdminAction
): Promise<ApiResponse<T>> {
  if (!firebaseUser) {
    return {
      success: false,
      error: "No authenticated user",
    }
  }

  try {
    const token = await firebaseUser.getIdToken()

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Action failed",
      }
    }

    return result
  } catch (error) {
    console.error(`Error executing action:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
