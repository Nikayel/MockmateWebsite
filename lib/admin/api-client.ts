import { User } from "firebase/auth"

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page: number
  limit: number
  search?: string
}

export interface PaginationResponse {
  page: number
  limit: number
  totalPages: number
  totalItems: number
}

export class AdminApiClient {
  private token: string | null = null

  constructor(private firebaseUser: User | null) {}

  async getToken(): Promise<string> {
    if (!this.firebaseUser) {
      throw new Error("No authenticated user")
    }

    if (!this.token) {
      this.token = await this.firebaseUser.getIdToken()
    }

    return this.token
  }

  async refreshToken(): Promise<string> {
    if (!this.firebaseUser) {
      throw new Error("No authenticated user")
    }

    this.token = await this.firebaseUser.getIdToken(true)
    return this.token
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getToken()

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data
    } catch (error) {
      console.error(`API request failed: ${url}`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: "GET" })
  }

  async post<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    })
  }
}

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export interface LoadDataOptions {
  forceRefresh?: boolean
  showLoading?: boolean
}

export async function loadAdminData<T>(
  firebaseUser: User | null,
  endpoint: string,
  params: Record<string, any> = {},
  options: LoadDataOptions = {}
): Promise<T | null> {
  if (!firebaseUser) return null

  try {
    const token = await firebaseUser.getIdToken()
    const query = buildQueryString(params)

    const response = await fetch(`${endpoint}${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to load data")
    }

    const result = await response.json()

    if (result.success) {
      return result.data || result.metrics || result
    }

    throw new Error(result.error || "Unknown error")
  } catch (error) {
    console.error(`Error loading ${endpoint}:`, error)
    throw error
  }
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

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return `$${formatNumber(amount, decimals)}`
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return tokens.toString()
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString()
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString()
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header]
        const stringValue = value === null || value === undefined ? "" : String(value)
        return stringValue.includes(",") ? `"${stringValue}"` : stringValue
      }).join(",")
    ),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
