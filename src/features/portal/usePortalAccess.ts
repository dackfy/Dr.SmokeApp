import React from 'react'
import { portalApi, type PortalApi } from './portalApi'
import type { PortalAccessSession } from './types'

type UsePortalAccessOptions = {
  employeeId?: string
  api?: PortalApi
  enabled?: boolean
}

const emptySession: PortalAccessSession = {
  status: 'inactive',
  pin: null,
  portalUrl: 'https://portal.dr-smoke.ru/',
  expiresAt: null,
}

export function usePortalAccess(options: UsePortalAccessOptions) {
  const {
    employeeId,
    api = portalApi,
    enabled = true,
  } = options

  const [session, setSession] = React.useState<PortalAccessSession>(emptySession)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const run = React.useCallback(
    async (
      action: (employeeId: string) => Promise<PortalAccessSession>,
      mode: 'load' | 'refresh' = 'load',
    ) => {
      if (!employeeId || !enabled) {
        return
      }

      if (mode === 'refresh') {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const nextSession = await action(employeeId)
        setSession(nextSession)
      } catch (requestError) {
        let recoveredSession: PortalAccessSession | null = null

        try {
          recoveredSession = await api.getStatus(employeeId)
        } catch {
          recoveredSession = null
        }

        if (recoveredSession) {
          setSession(recoveredSession)

          if (
            recoveredSession.pin ||
            recoveredSession.status === 'pending_confirm' ||
            recoveredSession.status === 'active'
          ) {
            setError(null)
            return
          }
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось получить данные доступа на портал'
        setError(message)
      } finally {
        if (mode === 'refresh') {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [api, employeeId, enabled],
  )

  const refresh = React.useCallback(
    () => run(id => api.getStatus(id), 'refresh'),
    [api, run],
  )

  const login = React.useCallback(
    () => run(id => api.login(id)),
    [api, run],
  )

  const confirm = React.useCallback(
    () => run(id => api.confirm(id)),
    [api, run],
  )

  const logout = React.useCallback(
    () => run(id => api.logout(id)),
    [api, run],
  )

  React.useEffect(() => {
    if (!enabled || !employeeId) {
      return
    }

    refresh()
  }, [employeeId, enabled, refresh])

  return {
    session,
    isLoading,
    isRefreshing,
    error,
    refresh,
    login,
    confirm,
    logout,
  }
}
