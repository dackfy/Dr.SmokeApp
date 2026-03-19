import React from 'react'
import type { AuthSession } from '../features/auth/types'
import EmployeeHomeScreen from './EmployeeHomeScreen'
import HrHomeScreen from './HrHomeScreen'
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

  if (role === 2) {
    return (
      <HrHomeScreen
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
