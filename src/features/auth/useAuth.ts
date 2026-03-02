import { useState } from 'react'
import { authApi, type AuthApi } from './authApi'
import type { AuthFormValues, AuthSession } from './types'
import { validateAuthForm } from './validators'

const initialForm: AuthFormValues = {
  identifier: '',
  password: '',
}

type UseAuthOptions = {
  api?: AuthApi
}

export function useAuth(options: UseAuthOptions = {}) {
  const api = options.api ?? authApi

  const [form, setForm] = useState<AuthFormValues>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)

  function updateField<K extends keyof AuthFormValues>(field: K, value: AuthFormValues[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (error) {
      setError(null)
    }
  }

  async function submit() {
    const validationError = validateAuthForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const nextSession = await api.login({
        identifier: form.identifier.trim(),
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
    form,
    isSubmitting,
    error,
    session,
    updateField,
    submit,
    resetSession,
  }
}
