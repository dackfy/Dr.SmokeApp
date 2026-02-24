import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { styles } from './AuthScreen.styles'
import { useAuth } from '../features/auth/useAuth'

export default function AuthScreen() {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Dr. Smoke</Text>

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

        <TextInput
          style={styles.input}
          placeholder="Пароль"
          placeholderTextColor="#7A7A7A"
          secureTextEntry
          autoCapitalize="none"
          value={form.password}
          onChangeText={text => updateField('password', text)}
          editable={!isSubmitting}
        />

        {isRegisterMode ? (
          <TextInput
            style={styles.input}
            placeholder="Повторите пароль"
            placeholderTextColor="#7A7A7A"
            secureTextEntry
            autoCapitalize="none"
            value={form.confirmPassword}
            onChangeText={text => updateField('confirmPassword', text)}
            editable={!isSubmitting}
          />
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {session ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Успех: {session.user.email}
              {session.user.name
                ? ` (${session.user.name}${session.user.lastName ? ` ${session.user.lastName}` : ''})`
                : ''}
            </Text>
            {session.user.city ? (
              <Text style={styles.successText}>Город: {session.user.city}</Text>
            ) : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={resetSession}>
              <Text style={styles.secondaryButtonText}>Сбросить сессию</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
