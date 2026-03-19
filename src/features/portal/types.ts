export type PortalAccessStatus =
  | 'inactive'
  | 'pending_confirm'
  | 'active'

export type PortalAccessSession = {
  status: PortalAccessStatus
  pin: string | null
  portalUrl: string
  expiresAt?: string | null
}

export type PortalStatusResponse = {
  status?: string
  pin_status?: string
  pin?: string | null
  pin_code?: string | null
  portalUrl?: string
  portal_url?: string
  expiresAt?: string | null
  expires_at?: string | null
}
