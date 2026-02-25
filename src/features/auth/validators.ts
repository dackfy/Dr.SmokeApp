import type { AuthFormValues, AuthMode } from './types'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateAuthForm(mode: AuthMode, values: AuthFormValues): string | null {
  const email = values.email.trim()
  const password = values.password.trim()
  const name = values.name.trim()
  const lastName = values.lastName.trim()
  const city = values.city.trim()

  if (mode === 'register' && name.length < 2) {
    return 'Имя должно быть не короче 2 символов'
  }

  if (mode === 'register' && lastName.length < 2) {
    return 'Фамилия должна быть не короче 2 символов'
  }

  if (mode === 'register' && city.length < 2) {
    return 'Укажите город'
  }

  if (!emailRegex.test(email)) {
    return 'Введите корректный email'
  }

  if (mode === 'register' && password.length < 6) {
    return 'Пароль должен быть не короче 6 символов'
  }

  if (mode === 'register' && values.password !== values.confirmPassword) {
    return 'Пароли не совпадают'
  }

  return null
}
