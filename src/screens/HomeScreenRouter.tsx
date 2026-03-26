import React from 'react'
import type { AuthSession } from '../features/auth/types'
import EmployeeHomeScreen from './EmployeeHomeScreen'
import DirectorHomeScreen from './DirectorHomeScreen'
import SuperHrHomeScreen from './SuperHrHomeScreen'
import RolePlaceholderHomeScreen from './RolePlaceholderHomeScreen'

type HomeScreenRouterProps = React.ComponentProps<typeof EmployeeHomeScreen> & {
  session: AuthSession
  isRefreshingSession?: boolean
  onRefreshSession?: () => Promise<void>
}

export default function HomeScreenRouter({
  session,
  isRefreshingSession,
  onRefreshSession,
  ...rest
}: HomeScreenRouterProps) {
  const role = Number(session.user.userRole ?? 3)

  if (role === 3) {
    return (
      <EmployeeHomeScreen
        session={session}
        isRefreshingSession={isRefreshingSession}
        onRefreshSession={onRefreshSession}
        {...rest}
      />
    )
  }

  if (role === 7) {
    return (
      <DirectorHomeScreen
        session={session}
        onLogout={rest.onLogout}
        onRefreshSession={onRefreshSession}
        onGoProfile={rest.onGoProfile}
      />
    )
  }

  if (role === 10) {
    return (
      <SuperHrHomeScreen
        session={session}
        onLogout={rest.onLogout}
        onRefreshSession={onRefreshSession}
        onGoProfile={rest.onGoProfile}
      />
    )
  }

  return (
    <RolePlaceholderHomeScreen
      session={session}
      role={role}
      isRefreshing={isRefreshingSession}
      onRefresh={onRefreshSession}
      onGoProfile={rest.onGoProfile}
    />
  )
}
