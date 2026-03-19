export type AuthUser = {
  id: string
  email: string
  telegramId?: number
  name?: string
  lastName?: string
  city?: string
  timezone?: string
  regionId?: number
  regionName?: string
  userRole?: number
}

export type AuthSession = {
  accessToken: string
  refreshToken?: string
  user: AuthUser
}

export type LoginRequest = {
  identifier: string
  password: string
}

export type ChangePasswordRequest = {
  employee_id: string
  oldPassword: string
  newPassword: string
}

export type ForgotPasswordRequest = {
  identity: string
}

export type ResetPasswordRequest = {
  identity: string
  code: string
  newPassword: string
}

export type RegisterRequest = {
  name: string
  lastName: string
  city: string
  email: string
  password: string
}

export type AuthFormValues = {
  identifier: string
  password: string
}
