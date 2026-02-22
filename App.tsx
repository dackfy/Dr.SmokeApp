import React from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AuthScreen from './src/screens/AuthScreen'

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AuthScreen />
    </SafeAreaProvider>
  )
}

export default App