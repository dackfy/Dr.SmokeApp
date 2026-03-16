import { buildApiUrl } from '../../config/api'
import type {
  AuthSession,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './types'

export interface AuthApi {
  login(payload: LoginRequest): Promise<AuthSession>
  register(payload: RegisterRequest): Promise<AuthSession>
  changePassword(payload: ChangePasswordRequest): Promise<void>
  forgotPassword(payload: ForgotPasswordRequest): Promise<void>
  resetPassword(payload: ResetPasswordRequest): Promise<void>
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
  userId?: string,
  timezone?: string,
  telegramId?: number
): AuthSession {
  return {
    accessToken: `mock-access-token-${Date.now()}`,
    refreshToken: `mock-refresh-token-${Date.now()}`,
    user: {
      id: userId ?? String(Date.now()),
      email,
      telegramId,
      name,
      lastName,
      city,
      timezone,
    },
  }
}

export const mockAuthApi: AuthApi = {
  async login(payload) {
    await wait(700)

    if (payload.identifier.toLowerCase() === 'error@test.com') {
      throw new Error('Тестовая ошибка логина (mock)')
    }

    return createSession(payload.identifier)
  },

  async register(payload) {
    await wait(900)

    if (payload.email.toLowerCase() === 'exists@test.com') {
      throw new Error('Пользователь уже существует (mock)')
    }

    return createSession(payload.email, payload.name, payload.lastName, payload.city)
  },

  async changePassword(payload) {
    await wait(600)

    if (payload.newPassword.length < 6) {
      throw new Error('Новый пароль должен быть не короче 6 символов')
    }
  },

  async forgotPassword(_payload) {
    await wait(700)
  },

  async resetPassword(payload) {
    await wait(700)
    if (payload.newPassword.length < 6) {
      throw new Error('Новый пароль должен быть не короче 6 символов')
    }
  },
}

type LoginResponse = {
  message?: string
  employee_id: number
  telegram_id?: number
  region_id?: number
  name?: string
  lastName?: string
  city?: string
  email?: string
  timezone?: string
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

function normalizePhoneForBackend(value: string) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''

  // +7XXXXXXXXXX -> 8XXXXXXXXXX to match DB format like 89XXXXXXXXX
  if (digits.length === 11 && digits.startsWith('7')) {
    return `8${digits.slice(1)}`
  }

  // XXXXXXXXXX -> 8XXXXXXXXXX
  if (digits.length === 10) {
    return `8${digits}`
  }

  return digits
}

function prepareIdentity(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (trimmed.includes('@')) {
    return trimmed.toLowerCase()
  }

  const normalizedPhone = normalizePhoneForBackend(trimmed)
  return normalizedPhone || trimmed
}

export const realAuthApi: AuthApi = {
  async login(payload) {
    const identifier = prepareIdentity(payload.identifier)
    const isEmailLike = identifier.includes('@')

    const res = await fetch(buildApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: identifier,
        identifier,
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

      if (res.status === 401) throw new AuthError('Неверный номер телефона или пароль', 401, code)
      if (res.status === 403) throw new AuthError('Аккаунт не активен', 403, code)
      if (res.status === 400) throw new AuthError('Введите номер телефона и пароль', 400, code)

      throw new AuthError('Ошибка сервера. Попробуйте позже.', res.status, code)
    }

    const ok = data as LoginResponse
    const normalizedServerEmail = String(ok.email || '').trim().toLowerCase()
    const fallbackEmail = isEmailLike ? identifier.toLowerCase() : ''
    return createSession(
      normalizedServerEmail || fallbackEmail,
      ok.name ?? extractNameFromGreeting(ok.message),
      ok.lastName,
      ok.city,
      String(ok.employee_id),
      ok.timezone,
      Number.isFinite(Number(ok.telegram_id)) ? Number(ok.telegram_id) : undefined
    )
  },

  async register(_payload) {
    throw new AuthError('Регистрация пока не подключена к серверу')
  },

  async changePassword(payload) {
    const res = await fetch(buildApiUrl('/auth/change-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: payload.employee_id,
        oldPassword: payload.oldPassword,
        newPassword: payload.newPassword,
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

      if (code === 'password_too_short') {
        throw new AuthError('Новый пароль должен быть не короче 8 символов', 400, code)
      }
      if (code === 'invalid_old_password') {
        throw new AuthError('Старый пароль введён неверно', 401, code)
      }
      if (code === 'employee_not_found') {
        throw new AuthError('Сотрудник не найден', 404, code)
      }
      if (code === 'password_not_set') {
        throw new AuthError('Текущий пароль не установлен', 403, code)
      }
      if (code === 'employee_id_old_new_required') {
        throw new AuthError('Заполните старый и новый пароль', 400, code)
      }

      throw new AuthError('Не удалось изменить пароль. Попробуйте позже.', res.status, code)
    }
  },

  async forgotPassword(payload) {
    const identity = prepareIdentity(payload.identity)

    const res = await fetch(buildApiUrl('/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity,
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

      if (code === 'identity_required') {
        throw new AuthError('Введите номер телефона', 400, code)
      }
      if (code === 'identity_not_found') {
        throw new AuthError('Пользователь с таким номером не найден', 404, code)
      }
      if (code === 'email_not_set') {
        throw new AuthError('Для этого пользователя не указана почта', 400, code)
      }

      throw new AuthError('Не удалось отправить код. Попробуйте позже.', res.status, code)
    }
  },

  async resetPassword(payload) {
    const identity = prepareIdentity(payload.identity)

    const res = await fetch(buildApiUrl('/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity,
        code: payload.code.trim(),
        newPassword: payload.newPassword,
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

      if (code === 'identity_code_new_required') {
        throw new AuthError('Заполните номер телефона, код и новый пароль', 400, code)
      }
      if (code === 'password_too_short') {
        throw new AuthError('Новый пароль должен быть не короче 8 символов', 400, code)
      }
      if (code === 'invalid_code') {
        throw new AuthError('Неверный или просроченный код', 400, code)
      }
      if (code === 'identity_not_found') {
        throw new AuthError('Пользователь с таким номером не найден', 404, code)
      }

      throw new AuthError('Не удалось сбросить пароль. Попробуйте позже.', res.status, code)
    }
  },
}

export const authApi: AuthApi = realAuthApi
