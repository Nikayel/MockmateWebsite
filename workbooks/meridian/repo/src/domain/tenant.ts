export interface Tenant {
  id: string
  name: string
  webhookUrl: string | null
  webhookSecret: string | null
  createdAt: string
}

export interface CreateTenantInput {
  name: string
  webhookUrl?: string | null
  webhookSecret?: string | null
}
