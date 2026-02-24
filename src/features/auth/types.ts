export type AuthMode = 'login' | 'register'

export type AuthUser = {
  id: string
  email: string
  name?: string
  lastName?: string
  city?: string
}

export type AuthSession = {
  accessToken: string
  refreshToken?: string
  user: AuthUser
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  name: string
  lastName: string
  city: string
  email: string
  password: string
}

export type AuthFormValues = {
  name: string
  lastName: string
  city: string
  email: string
  password: string
  confirmPassword: string
}
