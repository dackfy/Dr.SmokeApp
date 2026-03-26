import React from 'react'
import type { AuthSession } from '../features/auth/types'
import ManagementDashboardScreen from './ManagementDashboardScreen'

type DirectorHomeScreenProps = {
  session: AuthSession
  onLogout: () => void
  onRefreshSession?: () => Promise<void>
  onGoProfile?: () => void
}

export default function DirectorHomeScreen(props: DirectorHomeScreenProps) {
  return <ManagementDashboardScreen {...props} variant="director" />
}
