import React from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AuthScreen from './src/screens/AuthScreen'
import AndroidThemeIntro from './src/components/AndroidThemeIntro'
import AndroidThemeTransition from './src/components/AndroidThemeTransition'
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
        <AndroidThemeTransition />
        <AndroidThemeIntro />
      </AndroidThemeModeProvider>
    </SafeAreaProvider>
  )
}

export default function App() {
  return <AppContent />
}
