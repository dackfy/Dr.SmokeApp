import React from 'react'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AndroidThemeModeProvider value={androidThemeMode}>
          <StatusBar barStyle="light-content" />
          <AuthScreen />
          <AndroidThemeTransition />
          <AndroidThemeIntro />
        </AndroidThemeModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default function App() {
  return <AppContent />
}
