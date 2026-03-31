import React from 'react'
import type { AuthSession } from '../features/auth/types'
import ManagementDashboardScreen from './ManagementDashboardScreen'

type DeputyDirectorHomeScreenProps = {
  session: AuthSession
  onLogout: () => void
  onRefreshSession?: () => Promise<void>
  onGoProfile?: () => void
}

export default function DeputyDirectorHomeScreen(props: DeputyDirectorHomeScreenProps) {
  return <ManagementDashboardScreen {...props} variant="manager" />
}
