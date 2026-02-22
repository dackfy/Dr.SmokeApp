import React from 'react'
import { View, Text, TouchableOpacity, StatusBar } from 'react-native'
import { styles } from './AuthScreen.styles'

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Dr. Smoke</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Войти</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Зарегистрироваться</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
