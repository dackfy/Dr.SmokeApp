import React from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AuthScreen from './src/screens/AuthScreen'
import AndroidThemeIntro from './src/components/AndroidThemeIntro'
import {
  AndroidThemeModeProvider,
  useAndroidThemeModeState,
} from './src/theme/androidAppTheme'

function AppContent() {
  const androidThemeMode = useAndroidThemeModeState()

  return (
    <SafeAreaProvider>
      <AndroidThemeModeProvider value={androidThemeMode}>
        <StatusBar barStyle="light-content" />
        <AuthScreen />
        <AndroidThemeIntro />
      </AndroidThemeModeProvider>
    </SafeAreaProvider>
  )
}

export default function App() {
  return <AppContent />
}
