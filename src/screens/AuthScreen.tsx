import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { styles } from './AuthScreen.styles';
import { useAuth } from '../features/auth/useAuth';

const eyeOpenIcon = require('../assets/icons/eye-open.png');
const eyeClosedIcon = require('../assets/icons/eye-closed.png');
const homeIcon = require('../assets/icons/home.png');
const profileIcon = require('../assets/icons/profile.png');

type AuthTab = 'home' | 'profile';

export default function AuthScreen() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>('home');

  const {
    form,
    isSubmitting,
    error,
    session,
    updateField,
    submit,
    resetSession,
  } = useAuth();

  if (session) {
    const fullName = [session.user.name, session.user.lastName]
      .filter(Boolean)
      .join(' ');
    const displayName = fullName || session.user.email;

    const showProfile = activeTab === 'profile';

    return (
      <View style={styles.authenticatedScreen}>
        <StatusBar barStyle="light-content" />

        <View style={styles.authContent}>
          {showProfile ? (
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Привет, {displayName}</Text>
              <Text style={styles.welcomeSubtitle}>
                Вы успешно вошли в приложение
              </Text>

              <TouchableOpacity
                style={[styles.button, styles.logoutButton]}
                onPress={() => {
                  setActiveTab('home');
                  resetSession();
                }}
              >
                <Text style={styles.buttonText}>Выйти</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setActiveTab('home')}
            accessibilityRole="button"
            accessibilityLabel="Главная"
          >
            <Image
              source={homeIcon}
              style={[
                styles.navIcon,
                activeTab === 'home' && styles.navIconActive,
              ]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setActiveTab('profile')}
            accessibilityRole="button"
            accessibilityLabel="Профиль"
          >
            <Image
              source={profileIcon}
              style={[
                styles.navIcon,
                activeTab === 'profile' && styles.navIconActive,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Email или логин"
          placeholderTextColor="#7A7A7A"
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          value={form.identifier}
          onChangeText={text => updateField('identifier', text)}
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
            accessibilityLabel={
              isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'
            }
          >
            <Image
              source={isPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
              style={styles.eyeImage}
            />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={submit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Войти</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
