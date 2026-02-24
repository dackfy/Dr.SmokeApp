import { useState } from 'react'
import { mockAuthApi, type AuthApi } from './authApi'
import type { AuthFormValues, AuthMode, AuthSession } from './types'
import { validateAuthForm } from './validators'

const initialForm: AuthFormValues = {
  name: '',
  lastName: '',
  city: '',
  email: '',
  password: '',
  confirmPassword: '',
}

type UseAuthOptions = {
  api?: AuthApi
}

export function useAuth(options: UseAuthOptions = {}) {
  const api = options.api ?? mockAuthApi

  const [mode, setMode] = useState<AuthMode>('login')
  const [form, setForm] = useState<AuthFormValues>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)

  const isRegisterMode = mode === 'register'

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setForm(prev => ({
      ...prev,
      password: '',
      confirmPassword: '',
    }))
  }

  function updateField<K extends keyof AuthFormValues>(field: K, value: AuthFormValues[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (error) {
      setError(null)
    }
  }

  async function submit() {
    const validationError = validateAuthForm(mode, form)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const nextSession = isRegisterMode
        ? await api.register({
            name: form.name.trim(),
            lastName: form.lastName.trim(),
            city: form.city.trim(),
            email: form.email.trim(),
            password: form.password,
          })
        : await api.login({
            email: form.email.trim(),
            password: form.password,
          })

      setSession(nextSession)
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Не удалось выполнить запрос'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetSession() {
    setSession(null)
  }

  return {
    mode,
    form,
    isRegisterMode,
    isSubmitting,
    error,
    session,
    switchMode,
    updateField,
    submit,
    resetSession,
  }
}
