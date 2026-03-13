import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  InputAccessoryView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './AuthScreen.styles';
import { useAuth } from '../features/auth/useAuth';
import ShiftScreen from './ShiftScreen';
import { authApi } from '../features/auth/authApi';
import LiquidTabBar from '../components/LiquidTabBar';
import type { TabKey } from '../components/LiquidTabBar';

const eyeOpenIcon = require('../assets/icons/eye-open.png');
const eyeClosedIcon = require('../assets/icons/eye-closed.png');
const homeIcon = require('../assets/icons/home.png');
const profileIcon = require('../assets/icons/profile.png');
const mailIcon = require('../assets/icons/mail.png');
const trashIcon = require('../assets/icons/trash.png');

type AuthTab = TabKey;

export default function AuthScreen() {
  const authAccessoryId = 'auth-keyboard-accessory';
  const passwordInputRef = useRef<TextInput>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isOldPasswordVisible, setIsOldPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isResetPasswordVisible, setIsResetPasswordVisible] = useState(false);
  const [focusedProfileField, setFocusedProfileField] = useState<
    'oldPassword' | 'newPassword' | null
  >(null);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [focusedLoginField, setFocusedLoginField] = useState<
    'identifier' | 'password' | null
  >(null);
  const [focusedForgotField, setFocusedForgotField] = useState<
    'identity' | 'code' | 'newPassword' | null
  >(null);
  const [activeTab, setActiveTab] = useState<AuthTab>('home');
  const [isForgotPasswordFlow, setIsForgotPasswordFlow] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [forgotIdentity, setForgotIdentity] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(
    null,
  );
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<
    string | null
  >(null);

  const {
    form,
    isSubmitting,
    isHydrating,
    error,
    session,
    updateField,
    submit,
    resetSession,
  } = useAuth();

  const switchTab = React.useCallback(
    (nextTab: AuthTab) => {
      if (nextTab === 'home') {
        setActiveTab('home');
        setOldPassword('');
        setNewPassword('');
        setChangePasswordError(null);
        setChangePasswordSuccess(null);
        setIsOldPasswordVisible(false);
        setIsNewPasswordVisible(false);
        setFocusedProfileField(null);
        setIsPasswordSectionOpen(false);
        return;
      }
      setActiveTab(nextTab);
      setIsPasswordSectionOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (!authNotice) {
      return;
    }

    const timer = setTimeout(() => {
      setAuthNotice(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [authNotice]);

  const resetChangePasswordForm = () => {
    setOldPassword('');
    setNewPassword('');
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setIsOldPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setFocusedProfileField(null);
    setIsPasswordSectionOpen(false);
  };

  const resetForgotPasswordForm = () => {
    setIsForgotPasswordFlow(false);
    setIsCodeSent(false);
    setForgotIdentity('');
    setResetCode('');
    setResetNewPassword('');
    setForgotError(null);
    setIsResetPasswordVisible(false);
    setIsForgotSubmitting(false);
    setFocusedForgotField(null);
  };

  const sendResetCode = async () => {
    const identity = forgotIdentity.trim();
    if (!identity) {
      setForgotError('Введите логин или email');
      return;
    }

    setIsForgotSubmitting(true);
    setForgotError(null);
    try {
      await authApi.forgotPassword({ identity });
      setIsCodeSent(true);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Не удалось отправить код';
      setForgotError(message);
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const submitResetPassword = async () => {
    const identity = forgotIdentity.trim();
    const code = resetCode.trim();
    const newPass = resetNewPassword.trim();

    if (!identity) {
      setForgotError('Введите логин или email');
      return;
    }

    if (!code || !newPass) {
      setForgotError('Заполните логин/email, код и новый пароль');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setForgotError('Код должен состоять из 6 цифр');
      return;
    }

    if (newPass.length < 6) {
      setForgotError('Новый пароль должен быть не короче 6 символов');
      return;
    }

    setIsForgotSubmitting(true);
    setForgotError(null);
    try {
      await authApi.resetPassword({
        identity,
        code,
        newPassword: newPass,
      });
      resetForgotPasswordForm();
      updateField('identifier', identity);
      updateField('password', '');
      setAuthNotice('Пароль успешно сброшен. Войдите с новым паролем');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Не удалось сбросить пароль';
      setForgotError(message);
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const submitChangePassword = async () => {
    const oldPass = oldPassword.trim();
    const newPass = newPassword.trim();

    if (!oldPass || !newPass) {
      setChangePasswordError('Заполните старый и новый пароль');
      setChangePasswordSuccess(null);
      return;
    }

    if (newPass.length < 6) {
      setChangePasswordError('Новый пароль должен быть не короче 6 символов');
      setChangePasswordSuccess(null);
      return;
    }

    setIsChangingPassword(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    try {
      await authApi.changePassword({
        employee_id: session?.user.id ?? '',
        oldPassword: oldPass,
        newPassword: newPass,
      });
      setOldPassword('');
      setNewPassword('');
      setIsOldPasswordVisible(false);
      setIsNewPasswordVisible(false);
      setChangePasswordSuccess('Пароль успешно изменён');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось изменить пароль';
      setChangePasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isHydrating) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FF6A00" />
      </SafeAreaView>
    );
  }

  if (session) {
    const fullName = [session.user.name, session.user.lastName]
      .filter(Boolean)
      .join(' ');
    const displayName = fullName || session.user.email;

    const showProfile = activeTab === 'profile';
    const showMail = activeTab === 'mail';
    const showTrash = activeTab === 'trash';

    return (
      <View style={styles.authenticatedScreen}>
        {activeTab === 'home' ? (
          <ShiftScreen
            session={session}
            onLogout={() => {
              resetChangePasswordForm();
              setActiveTab('home');
              resetSession();
            }}
            onGoHome={() => setActiveTab('home')}
            onGoMail={() => setActiveTab('mail')}
            onGoTrash={() => setActiveTab('trash')}
            onGoProfile={() => {
              setActiveTab('profile');
              setIsPasswordSectionOpen(false);
            }}
            activeTab={activeTab}
            showHeaderActions={false}
            showTabBar={false}
          />
        ) : showMail ? (
          <SafeAreaView style={[styles.authenticatedScreen, { backgroundColor: '#000000' }]} />
        ) : showTrash ? (
          <SafeAreaView style={[styles.authenticatedScreen, { backgroundColor: '#FF6A00' }]} />
        ) : (
          <SafeAreaView style={styles.authenticatedScreen} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" />
            <View style={styles.authenticatedScreen}>
              <View style={[styles.authContent, showProfile && styles.profileContent]}>
                {showProfile ? (
                  <>
                    <View style={styles.welcomeCard}>
                      <Text style={styles.welcomeTitle}>Привет, {displayName}</Text>
                      <Text style={styles.welcomeSubtitle}>Профиль сотрудника</Text>

                      {!isPasswordSectionOpen ? (
                        <TouchableOpacity
                          style={[styles.button, styles.logoutButton]}
                          onPress={() => {
                            setIsPasswordSectionOpen(true);
                            setChangePasswordError(null);
                            setChangePasswordSuccess(null);
                          }}
                          disabled={isChangingPassword}
                        >
                          <Text style={styles.buttonText}>Смена пароля</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.profileForm}>
                          <View style={styles.passwordField}>
                            <TextInput
                              style={[
                                styles.input,
                                styles.passwordInput,
                                styles.profileInput,
                                focusedProfileField === 'oldPassword' && styles.inputFocused,
                              ]}
                              placeholder="Старый пароль"
                              placeholderTextColor="#7A7A7A"
                              secureTextEntry={!isOldPasswordVisible}
                              autoCapitalize="none"
                              value={oldPassword}
                              onFocus={() => setFocusedProfileField('oldPassword')}
                              onBlur={() => setFocusedProfileField(null)}
                              onChangeText={text => {
                                setOldPassword(text);
                                if (changePasswordError) {
                                  setChangePasswordError(null);
                                }
                              }}
                              editable={!isChangingPassword}
                            />
                            <TouchableOpacity
                              style={styles.eyeButton}
                              onPress={() => setIsOldPasswordVisible(prev => !prev)}
                              disabled={isChangingPassword}
                              accessibilityRole="button"
                              accessibilityLabel={
                                isOldPasswordVisible
                                  ? 'Скрыть старый пароль'
                                  : 'Показать старый пароль'
                              }
                            >
                              <Image
                                source={isOldPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
                                style={styles.eyeImage}
                              />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.passwordField}>
                            <TextInput
                              style={[
                                styles.input,
                                styles.passwordInput,
                                styles.profileInput,
                                focusedProfileField === 'newPassword' && styles.inputFocused,
                              ]}
                              placeholder="Новый пароль"
                              placeholderTextColor="#7A7A7A"
                              secureTextEntry={!isNewPasswordVisible}
                              autoCapitalize="none"
                              value={newPassword}
                              onFocus={() => setFocusedProfileField('newPassword')}
                              onBlur={() => setFocusedProfileField(null)}
                              onChangeText={text => {
                                setNewPassword(text);
                                if (changePasswordError) {
                                  setChangePasswordError(null);
                                }
                              }}
                              editable={!isChangingPassword}
                            />
                            <TouchableOpacity
                              style={styles.eyeButton}
                              onPress={() => setIsNewPasswordVisible(prev => !prev)}
                              disabled={isChangingPassword}
                              accessibilityRole="button"
                              accessibilityLabel={
                                isNewPasswordVisible
                                  ? 'Скрыть новый пароль'
                                  : 'Показать новый пароль'
                              }
                            >
                              <Image
                                source={isNewPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
                                style={styles.eyeImage}
                              />
                            </TouchableOpacity>
                          </View>

                          {changePasswordError ? (
                            <Text style={styles.errorText}>{changePasswordError}</Text>
                          ) : null}
                          {changePasswordSuccess ? (
                            <Text style={styles.successTextInline}>{changePasswordSuccess}</Text>
                          ) : null}

                          <TouchableOpacity
                            style={[styles.button, styles.logoutButton]}
                            onPress={submitChangePassword}
                            disabled={isChangingPassword}
                          >
                            {isChangingPassword ? (
                              <ActivityIndicator color="#FFFFFF" />
                            ) : (
                              <Text style={styles.buttonText}>Сохранить пароль</Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.linkButton}
                            onPress={resetChangePasswordForm}
                            disabled={isChangingPassword}
                          >
                            <Text style={styles.linkButtonText}>Назад в профиль</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.logoutSmallButton}
                      onPress={() => {
                        resetChangePasswordForm();
                        setActiveTab('home');
                        resetSession();
                      }}
                    >
                      <Text style={styles.logoutSmallButtonText}>Выйти</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </SafeAreaView>
        )}

        <LiquidTabBar
          activeTab={activeTab}
          onTabChange={switchTab}
          homeIcon={homeIcon}
          profileIcon={profileIcon}
          mailIcon={mailIcon}
          trashIcon={trashIcon}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.authContent}>
      <View style={styles.formCard}>
        {isForgotPasswordFlow ? (
          <>
            <Text style={styles.sectionTitle}>Восстановление пароля</Text>
            {!isCodeSent ? (
              <TextInput
                style={[
                  styles.input,
                  focusedForgotField === 'identity' && styles.inputFocused,
                ]}
                placeholder="Email или логин"
                placeholderTextColor="#7A7A7A"
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                value={forgotIdentity}
                onFocus={() => setFocusedForgotField('identity')}
                onBlur={() => setFocusedForgotField(null)}
                returnKeyType="done"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  if (!isForgotSubmitting) {
                    sendResetCode();
                  }
                }}
                inputAccessoryViewID={Platform.OS === 'ios' ? authAccessoryId : undefined}
                onChangeText={text => {
                  setForgotIdentity(text);
                  if (forgotError) {
                    setForgotError(null);
                  }
                }}
                editable={!isForgotSubmitting}
              />
            ) : null}

            {!isCodeSent ? (
              <TouchableOpacity
                style={[styles.button, isForgotSubmitting && styles.buttonDisabled]}
                onPress={sendResetCode}
                disabled={isForgotSubmitting}
              >
                {isForgotSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Получить код</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {isCodeSent ? (
              <>
                <TextInput
                  style={[
                    styles.input,
                    focusedForgotField === 'code' && styles.inputFocused,
                  ]}
                  placeholder="Код из почты"
                  placeholderTextColor="#7A7A7A"
                  keyboardType="number-pad"
                  value={resetCode}
                  onFocus={() => setFocusedForgotField('code')}
                  onBlur={() => setFocusedForgotField(null)}
                  inputAccessoryViewID={Platform.OS === 'ios' ? authAccessoryId : undefined}
                  onChangeText={text => {
                    setResetCode(text);
                    if (forgotError) {
                      setForgotError(null);
                    }
                  }}
                  editable={!isForgotSubmitting}
                />

                <View style={styles.passwordField}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      focusedForgotField === 'newPassword' && styles.inputFocused,
                    ]}
                    placeholder="Новый пароль"
                    placeholderTextColor="#7A7A7A"
                    secureTextEntry={!isResetPasswordVisible}
                    autoCapitalize="none"
                    value={resetNewPassword}
                    onFocus={() => setFocusedForgotField('newPassword')}
                    onBlur={() => setFocusedForgotField(null)}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    inputAccessoryViewID={Platform.OS === 'ios' ? authAccessoryId : undefined}
                    onChangeText={text => {
                      setResetNewPassword(text);
                      if (forgotError) {
                        setForgotError(null);
                      }
                    }}
                    editable={!isForgotSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setIsResetPasswordVisible(prev => !prev)}
                    disabled={isForgotSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isResetPasswordVisible ? 'Скрыть новый пароль' : 'Показать новый пароль'
                    }
                  >
                    <Image
                      source={isResetPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
                      style={styles.eyeImage}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, isForgotSubmitting && styles.buttonDisabled]}
                  onPress={submitResetPassword}
                  disabled={isForgotSubmitting}
                >
                  {isForgotSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Сбросить пароль</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {forgotError ? <Text style={styles.errorText}>{forgotError}</Text> : null}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={resetForgotPasswordForm}
              disabled={isForgotSubmitting}
            >
              <Text style={styles.linkButtonText}>Назад</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
        <TextInput
          style={[
            styles.input,
            focusedLoginField === 'identifier' && styles.inputFocused,
          ]}
          placeholder="Email или логин"
          placeholderTextColor="#7A7A7A"
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          inputAccessoryViewID={Platform.OS === 'ios' ? authAccessoryId : undefined}
          returnKeyType="next"
          value={form.identifier}
          onChangeText={text => {
            updateField('identifier', text);
            if (authNotice) {
              setAuthNotice(null);
            }
          }}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          onFocus={() => setFocusedLoginField('identifier')}
          onBlur={() => setFocusedLoginField(null)}
          editable={!isSubmitting}
        />

        <View style={styles.passwordField}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              focusedLoginField === 'password' && styles.inputFocused,
            ]}
            placeholder="Пароль"
            placeholderTextColor="#7A7A7A"
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
            inputAccessoryViewID={Platform.OS === 'ios' ? authAccessoryId : undefined}
            ref={passwordInputRef}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            value={form.password}
            onChangeText={text => {
              updateField('password', text);
              if (authNotice) {
                setAuthNotice(null);
              }
            }}
            onFocus={() => setFocusedLoginField('password')}
            onBlur={() => setFocusedLoginField(null)}
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

        {authNotice ? (
          <View style={styles.authNoticeBox}>
            <Text style={styles.authNoticeText}>{authNotice}</Text>
          </View>
        ) : null}

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

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            setIsForgotPasswordFlow(true);
            setForgotIdentity(form.identifier);
            setForgotError(null);
            setAuthNotice(null);
            setIsCodeSent(false);
          }}
          disabled={isSubmitting}
        >
          <Text style={styles.linkButtonText}>Забыли пароль?</Text>
        </TouchableOpacity>
          </>
        )}
      </View>
      </View>
      </TouchableWithoutFeedback>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={authAccessoryId}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity onPress={Keyboard.dismiss} style={styles.keyboardAccessoryButton}>
              <Text style={styles.keyboardAccessoryText}>Готово</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
  );
}
