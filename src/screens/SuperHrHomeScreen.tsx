import React from 'react'
import type { AuthSession } from '../features/auth/types'
import ManagementDashboardScreen from './ManagementDashboardScreen'

type SuperHrHomeScreenProps = {
  session: AuthSession
  onLogout: () => void
  onRefreshSession?: () => Promise<void>
  onGoProfile?: () => void
}

export default function SuperHrHomeScreen(props: SuperHrHomeScreenProps) {
  return <ManagementDashboardScreen {...props} variant="superHr" />
}
