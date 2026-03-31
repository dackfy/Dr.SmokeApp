import React from 'react'
import type { AuthSession } from '../features/auth/types'
import ManagementDashboardScreen from './ManagementDashboardScreen'

type ManagerHomeScreenProps = {
  session: AuthSession
  onLogout: () => void
  onRefreshSession?: () => Promise<void>
  onGoProfile?: () => void
}

export default function ManagerHomeScreen(props: ManagerHomeScreenProps) {
  return <ManagementDashboardScreen {...props} variant="manager" />
}
