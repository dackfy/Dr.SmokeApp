import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native'
import { styles } from './AuthScreen.styles'
import { useAuth } from '../features/auth/useAuth'

const eyeOpenIcon = require('../assets/icons/eye-open.png')
const eyeClosedIcon = require('../assets/icons/eye-closed.png')

export default function AuthScreen() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)

  const {
    mode,
    form,
    isRegisterMode,
    isSubmitting,
    error,
    session,
    switchMode,
    updateField,
    submit,
    resetSession,
  } = useAuth()

  if (session) {
    const fullName = [session.user.name, session.user.lastName].filter(Boolean).join(' ')
    const displayName = fullName || session.user.email

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Привет, {displayName}</Text>
          <Text style={styles.welcomeSubtitle}>Вы успешно вошли в приложение</Text>

          <TouchableOpacity style={styles.button} onPress={resetSession}>
            <Text style={styles.buttonText}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.modeSwitch}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
          onPress={() => switchMode('login')}
          disabled={isSubmitting}>
          <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>
            Войти
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
          onPress={() => switchMode('register')}
          disabled={isSubmitting}>
          <Text
            style={[styles.modeButtonText, mode === 'register' && styles.modeButtonTextActive]}>
            Регистрация
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formCard}>
        {isRegisterMode ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Имя"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="words"
              value={form.name}
              onChangeText={text => updateField('name', text)}
              editable={!isSubmitting}
            />

            <TextInput
              style={styles.input}
              placeholder="Фамилия"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="words"
              value={form.lastName}
              onChangeText={text => updateField('lastName', text)}
              editable={!isSubmitting}
            />

            <TextInput
              style={styles.input}
              placeholder="Город"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="words"
              value={form.city}
              onChangeText={text => updateField('city', text)}
              editable={!isSubmitting}
            />
          </>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7A7A7A"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={form.email}
          onChangeText={text => updateField('email', text)}
          editable={!isSubmitting}
        />

        <View style={styles.passwordField}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Пароль"
            placeholderTextColor="#7A7A7A"
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
            value={form.password}
            onChangeText={text => updateField('password', text)}
            editable={!isSubmitting}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setIsPasswordVisible(prev => !prev)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}>
            <Image
              source={isPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
              style={styles.eyeImage}
            />
          </TouchableOpacity>
        </View>

        {isRegisterMode ? (
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Повторите пароль"
              placeholderTextColor="#7A7A7A"
              secureTextEntry={!isConfirmPasswordVisible}
              autoCapitalize="none"
              value={form.confirmPassword}
              onChangeText={text => updateField('confirmPassword', text)}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setIsConfirmPasswordVisible(prev => !prev)}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={
                isConfirmPasswordVisible ? 'Скрыть подтверждение пароля' : 'Показать пароль'
              }>
              <Image
                source={isConfirmPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
                style={styles.eyeImage}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={submit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegisterMode ? 'Создать аккаунт' : 'Войти'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
