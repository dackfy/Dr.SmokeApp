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

function createSession(options: {
  email: string
  name?: string
  lastName?: string
  city?: string
  userId?: string
  timezone?: string
  telegramId?: number
  regionId?: number
  regionName?: string
  userRole?: number
}): AuthSession {
  return {
    accessToken: `mock-access-token-${Date.now()}`,
    refreshToken: `mock-refresh-token-${Date.now()}`,
    user: {
      id: options.userId ?? String(Date.now()),
      email: options.email,
      telegramId: options.telegramId,
      name: options.name,
      lastName: options.lastName,
      city: options.city,
      timezone: options.timezone,
      regionId: options.regionId,
      regionName: options.regionName,
      userRole: options.userRole,
    },
  }
}

export const mockAuthApi: AuthApi = {
  async login(payload) {
    await wait(700)

    if (payload.identifier.toLowerCase() === 'error@test.com') {
      throw new Error('Тестовая ошибка логина (mock)')
    }

    return createSession({ email: payload.identifier, userRole: 3 })
  },

  async register(payload) {
    await wait(900)

    if (payload.email.toLowerCase() === 'exists@test.com') {
      throw new Error('Пользователь уже существует (mock)')
    }

    return createSession({
      email: payload.email,
      name: payload.name,
      lastName: payload.lastName,
      city: payload.city,
      userRole: 3,
    })
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
  region_name?: string
  name?: string
  lastName?: string
  city?: string
  email?: string
  timezone?: string
  user_role?: number
  employee?: {
    id?: number
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    region_id?: number | null
    region_name?: string | null
    timezone?: string | null
    user_role?: number | null
  }
}

type EmployeeProfileResponse = {
  employee?: {
    id?: number
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone_number?: string | null
    region_id?: number | null
    region_name?: string | null
    timezone?: string | null
    user_role?: number | null
  }
  error?: string
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

function buildSessionFromServerAuth(
  payload: LoginResponse,
  options: {
    identifier?: string
    isEmailLike?: boolean
    previousSession?: AuthSession
  } = {},
) {
  const employee = payload.employee
  const employeeId = employee?.id ?? payload.employee_id
  const employeeEmail = employee?.email ?? payload.email
  const employeeRegionId = employee?.region_id ?? payload.region_id
  const employeeRegionName = employee?.region_name ?? payload.region_name
  const employeeTimezone = employee?.timezone ?? payload.timezone
  const employeeRole = employee?.user_role ?? payload.user_role
  const employeeFirstName =
    employee?.first_name ??
    payload.name ??
    extractNameFromGreeting(payload.message) ??
    options.previousSession?.user.name
  const employeeLastName = employee?.last_name ?? payload.lastName ?? options.previousSession?.user.lastName
  const normalizedServerEmail = String(employeeEmail || '').trim().toLowerCase()
  const fallbackEmail =
    options.isEmailLike && options.identifier ? options.identifier.toLowerCase() : options.previousSession?.user.email || ''

  return createSession({
    email: normalizedServerEmail || fallbackEmail,
    name: employeeFirstName,
    lastName: employeeLastName,
    city: payload.city ?? options.previousSession?.user.city,
    userId: String(employeeId ?? options.previousSession?.user.id ?? ''),
    timezone: employeeTimezone ?? options.previousSession?.user.timezone,
    telegramId: Number.isFinite(Number(payload.telegram_id))
      ? Number(payload.telegram_id)
      : options.previousSession?.user.telegramId,
    regionId: Number.isFinite(Number(employeeRegionId))
      ? Number(employeeRegionId)
      : options.previousSession?.user.regionId,
    regionName: employeeRegionName ?? options.previousSession?.user.regionName,
    userRole: Number.isFinite(Number(employeeRole))
      ? Number(employeeRole)
      : (options.previousSession?.user.userRole ?? 3),
  })
}

export async function checkEmployeeAccess(employeeId: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/employees/${encodeURIComponent(employeeId)}/access-status`))

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // ignore non-JSON response
  }

  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error

    if (res.status === 403 && code === 'account_access_restricted') {
      throw new AuthError('Доступ к вашему аккаунту ограничен', 403, code)
    }

    throw new AuthError('Не удалось проверить доступ к аккаунту', res.status, code)
  }
}

export async function refreshEmployeeSession(session: AuthSession): Promise<AuthSession> {
  const employeeId = String(session.user.id || '').trim()

  if (!employeeId) {
    throw new AuthError('Не удалось определить сотрудника для обновления профиля')
  }

  const res = await fetch(buildApiUrl(`/employees/${encodeURIComponent(employeeId)}/profile`))

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // ignore non-JSON response
  }

  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error

    if (code === 'account_access_restricted') {
      throw new AuthError('Доступ к вашему аккаунту ограничен', 403, code)
    }
    if (code === 'employee_not_found') {
      throw new AuthError('Сотрудник не найден', 404, code)
    }

    throw new AuthError('Не удалось обновить данные профиля', res.status, code)
  }

  return buildSessionFromServerAuth(data as EmployeeProfileResponse as LoginResponse, {
    previousSession: session,
  })
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

      if (code === 'account_access_restricted') {
        throw new AuthError('Доступ к вашему аккаунту ограничен', 403, code)
      }
      if (res.status === 401) throw new AuthError('Неверный номер телефона или пароль', 401, code)
      if (res.status === 403) throw new AuthError('Аккаунт не активен', 403, code)
      if (res.status === 400) throw new AuthError('Введите номер телефона и пароль', 400, code)

      throw new AuthError('Ошибка сервера. Попробуйте позже.', res.status, code)
    }

    const ok = data as LoginResponse
    return buildSessionFromServerAuth(ok, {
      identifier,
      isEmailLike,
    })
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

      if (code === 'account_access_restricted') {
        throw new AuthError('Доступ к вашему аккаунту ограничен', 403, code)
      }
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

      if (code === 'account_access_restricted') {
        throw new AuthError('Доступ к вашему аккаунту ограничен', 403, code)
      }
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
