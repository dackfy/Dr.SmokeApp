import { buildApiUrl } from '../../config/api'
import type { AuthSession, LoginRequest, RegisterRequest } from './types'

export interface AuthApi {
  login(payload: LoginRequest): Promise<AuthSession>
  register(payload: RegisterRequest): Promise<AuthSession>
}

function wait(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}

function createSession(
  email: string,
  name?: string,
  lastName?: string,
  city?: string,
  userId?: string
): AuthSession {
  return {
    accessToken: `mock-access-token-${Date.now()}`,
    refreshToken: `mock-refresh-token-${Date.now()}`,
    user: {
      id: userId ?? String(Date.now()),
      email,
      name,
      lastName,
      city,
    },
  }
}

export const mockAuthApi: AuthApi = {
  async login(payload) {
    await wait(700)

    if (payload.email.toLowerCase() === 'error@test.com') {
      throw new Error('Тестовая ошибка логина (mock)')
    }

    return createSession(payload.email)
  },

  async register(payload) {
    await wait(900)

    if (payload.email.toLowerCase() === 'exists@test.com') {
      throw new Error('Пользователь уже существует (mock)')
    }

    return createSession(payload.email, payload.name, payload.lastName, payload.city)
  },
}

type LoginResponse = {
  message?: string
  employee_id: number
  region_id?: number
  name?: string
  lastName?: string
  city?: string
  email?: string
}

function extractNameFromGreeting(message?: string) {
  if (!message) return undefined

  const match = message.match(/^Привет,\s*(.+)$/i)
  return match?.[1]?.trim() || undefined
}

class AuthError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const realAuthApi: AuthApi = {
  async login(payload) {
    const res = await fetch(buildApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      }),
    })

    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      // ignore non-JSON response
    }

    if (!res.ok) {
      const code = (data as { error?: string } | null)?.error

      if (res.status === 401) throw new AuthError('Неверный email или пароль', 401, code)
      if (res.status === 403) throw new AuthError('Аккаунт не активен', 403, code)
      if (res.status === 400) throw new AuthError('Введите email и пароль', 400, code)

      throw new AuthError('Ошибка сервера. Попробуйте позже.', res.status, code)
    }

    const ok = data as LoginResponse
    return createSession(
      ok.email ?? payload.email,
      ok.name ?? extractNameFromGreeting(ok.message),
      ok.lastName,
      ok.city,
      String(ok.employee_id)
    )
  },

  async register(_payload) {
    throw new AuthError('Регистрация пока не подключена к серверу')
  },
}

export const authApi: AuthApi = realAuthApi
