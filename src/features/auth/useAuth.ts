import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authApi, type AuthApi } from './authApi'
import type { AuthFormValues, AuthSession } from './types'
import { validateAuthForm } from './validators'

const initialForm: AuthFormValues = {
  identifier: '',
  password: '',
}

const AUTH_SESSION_STORAGE_KEY = 'drsmoke.auth.session'

type UseAuthOptions = {
  api?: AuthApi
}

export function useAuth(options: UseAuthOptions = {}) {
  const api = options.api ?? authApi

  const [form, setForm] = useState<AuthFormValues>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHydrating, setIsHydrating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      try {
        const rawSession = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY)
        if (!rawSession || !isMounted) {
          return
        }

        const parsedSession = JSON.parse(rawSession) as AuthSession
        setSession(parsedSession)
      } catch {
        await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      } finally {
        if (isMounted) {
          setIsHydrating(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

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
      await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Не удалось выполнить запрос'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetSession() {
    AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY).catch(() => {})
    setSession(null)
    setForm(initialForm)
    setError(null)
    setIsSubmitting(false)
  }

  return {
    form,
    isSubmitting,
    isHydrating,
    error,
    session,
    updateField,
    submit,
    resetSession,
  }
}
