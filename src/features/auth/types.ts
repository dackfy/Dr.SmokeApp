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
  identifier: string
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
  identifier: string
  password: string
}
