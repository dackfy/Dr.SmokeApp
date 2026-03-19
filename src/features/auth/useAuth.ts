import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authApi, refreshEmployeeSession, type AuthApi } from './authApi'
import type { AuthFormValues, AuthSession } from './types'
import { validateAuthForm } from './validators'

const initialForm: AuthFormValues = {
  identifier: '+7',
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
  const [errorVersion, setErrorVersion] = useState(0)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)

  function showError(message: string) {
    setError(message)
    setErrorVersion(prev => prev + 1)
  }

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      try {
        const rawSession = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY)
        if (!rawSession || !isMounted) {
          return
        }

        const parsedSession = JSON.parse(rawSession) as AuthSession
        const restoredEmail = String(parsedSession.user?.email || '').trim()
        const sanitizedSession: AuthSession = {
          ...parsedSession,
          user: {
            ...parsedSession.user,
            email: restoredEmail.includes('@') ? restoredEmail : '',
            userRole: Number.isFinite(Number(parsedSession.user?.userRole))
              ? Number(parsedSession.user?.userRole)
              : 3,
          },
        }

        setSession(sanitizedSession)
        await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(sanitizedSession))
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
      showError(validationError)
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
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function refreshSession() {
    if (!session || isRefreshingSession) {
      return
    }

    setIsRefreshingSession(true)

    try {
      const nextSession = await refreshEmployeeSession(session)
      setSession(nextSession)
      await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    } finally {
      setIsRefreshingSession(false)
    }
  }

  function resetSession() {
    AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY).catch(() => {})
    setSession(null)
    setForm(initialForm)
    setError(null)
    setIsSubmitting(false)
  }

  function clearError() {
    setError(null)
  }

  return {
    form,
    isSubmitting,
    isHydrating,
    error,
    errorVersion,
    session,
    isRefreshingSession,
    updateField,
    submit,
    refreshSession,
    resetSession,
    clearError,
  }
}
