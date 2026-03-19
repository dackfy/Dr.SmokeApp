import React from 'react'
import ShiftScreen from './ShiftScreen'

type EmployeeHomeScreenProps = React.ComponentProps<typeof ShiftScreen>

export default function EmployeeHomeScreen(props: EmployeeHomeScreenProps) {
  return <ShiftScreen {...props} />
}
