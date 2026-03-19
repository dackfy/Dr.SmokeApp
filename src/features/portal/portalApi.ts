import { buildApiUrl } from '../../config/api'
import type {
  PortalAccessSession,
  PortalAccessStatus,
  PortalStatusResponse,
} from './types'

export interface PortalApi {
  getStatus(employeeId: string): Promise<PortalAccessSession>
  login(employeeId: string): Promise<PortalAccessSession>
  confirm(employeeId: string): Promise<PortalAccessSession>
  logout(employeeId: string): Promise<PortalAccessSession>
}

const DEFAULT_PORTAL_URL = 'https://portal.dr-smoke.ru/'

class PortalApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function normalizeStatus(status?: string): PortalAccessStatus {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'pending_confirm' || normalized === 'expectation' || normalized === 'block') {
    return 'pending_confirm'
  }

  if (normalized === 'active' || normalized === 'allowed') {
    return 'active'
  }

  return 'inactive'
}

function normalizeSession(data: PortalStatusResponse | null | undefined): PortalAccessSession {
  const rawStatus = data?.status ?? data?.pin_status
  const rawPin = data?.pin ?? data?.pin_code
  const rawPortalUrl = data?.portalUrl ?? data?.portal_url
  const rawExpiresAt = data?.expiresAt ?? data?.expires_at

  return {
    status: normalizeStatus(rawStatus),
    pin: rawPin ? String(rawPin) : null,
    portalUrl: String(rawPortalUrl || DEFAULT_PORTAL_URL),
    expiresAt: rawExpiresAt ?? null,
  }
}

async function requestPortal(
  path: string,
  init?: RequestInit,
): Promise<PortalAccessSession> {
  const res = await fetch(buildApiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // ignore non-JSON response
  }

  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error

    if (res.status === 404) {
      throw new PortalApiError('API доступа на портал пока не подключено на сервере', 404, code)
    }
    if (res.status === 403) {
      throw new PortalApiError('Доступ к порталу недоступен для этого аккаунта', 403, code)
    }
    if (res.status === 409) {
      throw new PortalApiError('Сессия портала уже активна', 409, code)
    }

    throw new PortalApiError('Не удалось выполнить действие для портала', res.status, code)
  }

  return normalizeSession(data as PortalStatusResponse | null)
}

export const realPortalApi: PortalApi = {
  async getStatus(employeeId) {
    return requestPortal(`/employees/${encodeURIComponent(employeeId)}/portal-access/status`)
  },

  async login(employeeId) {
    return requestPortal(`/employees/${encodeURIComponent(employeeId)}/portal-access/login`, {
      method: 'POST',
    })
  },

  async confirm(employeeId) {
    return requestPortal(`/employees/${encodeURIComponent(employeeId)}/portal-access/confirm`, {
      method: 'POST',
    })
  },

  async logout(employeeId) {
    return requestPortal(`/employees/${encodeURIComponent(employeeId)}/portal-access/logout`, {
      method: 'POST',
    })
  },
}

export const portalApi: PortalApi = realPortalApi

export { PortalApiError, DEFAULT_PORTAL_URL }
