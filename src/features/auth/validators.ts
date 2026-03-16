import type { AuthFormValues } from './types'

export function validateAuthForm(values: AuthFormValues): string | null {
  const identifier = values.identifier.trim()
  const password = values.password.trim()
  const phoneDigits = identifier.replace(/\D/g, '')
  const hasPhoneInput = phoneDigits.length > 1 // "+7" alone is treated as empty

  if (!hasPhoneInput && password.length < 1) {
    return 'Введите номер телефона и пароль'
  }

  if (!hasPhoneInput) {
    return 'Введите номер телефона'
  }

  if (password.length < 1) {
    return 'Введите пароль'
  }

  if (phoneDigits.length !== 11 || !phoneDigits.startsWith('7')) {
    return 'Неверный формат номера телефона'
  }

  return null
}
