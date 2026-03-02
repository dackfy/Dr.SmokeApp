import type { AuthFormValues } from './types'

export function validateAuthForm(values: AuthFormValues): string | null {
  const identifier = values.identifier.trim()
  const password = values.password.trim()

  if (identifier.length < 1) {
    return 'Введите email или логин'
  }

  if (password.length < 1) {
    return 'Введите пароль'
  }

  return null
}
