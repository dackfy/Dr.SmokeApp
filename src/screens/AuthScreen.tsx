import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
  Pressable,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './AuthScreen.styles';
import { useAuth } from '../features/auth/useAuth';
import MoreScreen from './MoreScreen';
import CertificatesScreen from './CertificatesScreen';
import HomeScreenRouter from './HomeScreenRouter';
import { authApi } from '../features/auth/authApi';
import LiquidTabBar from '../components/LiquidTabBar';
import type { TabKey } from '../components/LiquidTabBar';
import { useAndroidThemeMode } from '../theme/androidAppTheme';
import {
  getAndroidCompanyPalette,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors';

const eyeOpenIcon = require('../assets/icons/eye-open.png');
const eyeClosedIcon = require('../assets/icons/eye-closed.png');
const homeIcon = require('../assets/icons/home.png');
const profileIcon = require('../assets/icons/more.png');
const mailIcon = require('../assets/icons/mail.png');
const trashIcon = require('../assets/icons/trash.png');
const crossIcon = require('../assets/icons/cross.png');
const lockIcon = require('../assets/icons/lock.png');

type AuthTab = TabKey;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const MESSAGE_VISIBLE_MS = 2550;
const MESSAGE_FADE_MS = 450;
const MESSAGE_FADE_IN_MS = 120;

function validateStrongPassword(value: string): string | null {
  if (value.length < 8) {
    return 'Новый пароль должен быть не короче 8 символов';
  }

  if (!/^[A-Za-z0-9]+$/.test(value)) {
    return 'Пароль должен содержать только латинские буквы и цифры';
  }

  if (!/[A-Z]/.test(value)) {
    return 'Пароль должен содержать хотя бы одну заглавную букву';
  }

  if (!/\d/.test(value)) {
    return 'Пароль должен содержать хотя бы одну цифру';
  }

  return null;
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '+7';
  }

  // User enters local digits after +7; if started with 7/8, drop prefix.
  const local = (digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits).slice(0, 10);

  if (!local) return '+7';

  const p1 = local.slice(0, 3);
  const p2 = local.slice(3, 6);
  const p3 = local.slice(6, 8);
  const p4 = local.slice(8, 10);

  let out = '+7';
  if (p1) out += ` (${p1}`;
  if (p1.length === 3) out += ')';
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;

  return out;
}

function extractLocalPhoneDigits(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return (digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits).slice(0, 10);
}

function formatPhoneInputWithBackspace(prevValue: string, nextValue: string) {
  const prevLocal = extractLocalPhoneDigits(prevValue);
  const nextLocal = extractLocalPhoneDigits(nextValue);

  // If user deleted only mask symbols ( ) - and local digits count did not change,
  // treat it as deleting one digit to avoid "stuck" backspace behavior.
  if (nextValue.length < prevValue.length && nextLocal.length === prevLocal.length) {
    return formatPhoneInput(`+7${prevLocal.slice(0, -1)}`);
  }

  return formatPhoneInput(nextValue);
}

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const androidTheme = useAndroidThemeMode();
  const isAndroid = Platform.OS === 'android';
  const androidPalette = isAndroid
    ? androidTheme.mode === 'company'
      ? getAndroidCompanyPalette()
      : getAndroidThemePalette(colorScheme === 'dark')
    : null;
  const authAccessoryId = 'auth-keyboard-accessory';
  const insets = useSafeAreaInsets();
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
  const [loginPhoneSelection, setLoginPhoneSelection] = useState({ start: 2, end: 2 });
  const [focusedForgotField, setFocusedForgotField] = useState<
    'identity' | 'code' | 'newPassword' | null
  >(null);
  const [forgotPhoneSelection, setForgotPhoneSelection] = useState({ start: 2, end: 2 });
  const [activeTab, setActiveTab] = useState<AuthTab>('home');
  const [isForgotPasswordFlow, setIsForgotPasswordFlow] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [forgotIdentity, setForgotIdentity] = useState('+7');
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
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [previousTab, setPreviousTab] = useState<AuthTab>('home');
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const profileSheetProgress = useRef(new Animated.Value(0)).current;
  const tabTransitionProgress = useRef(new Animated.Value(1)).current;
  const authNoticeOpacity = useRef(new Animated.Value(0)).current;
  const forgotErrorOpacity = useRef(new Animated.Value(0)).current;
  const loginErrorOpacity = useRef(new Animated.Value(0)).current;
  const changePasswordErrorOpacity = useRef(new Animated.Value(0)).current;
  const changePasswordSuccessOpacity = useRef(new Animated.Value(0)).current;
  const forgotSubmitLockRef = useRef(false);

  const {
    form,
    isSubmitting,
    isHydrating,
    error,
    errorVersion,
    session,
    isRefreshingSession,
    updateField,
    submit,
    refreshSession,
    resetSession,
    clearError,
  } = useAuth();

  const openProfileSheet = React.useCallback(() => {
    setIsProfileSheetOpen(true);
    setIsPasswordSectionOpen(false);
    profileSheetProgress.stopAnimation();
    profileSheetProgress.setValue(0);
    Animated.spring(profileSheetProgress, {
      toValue: 1,
      stiffness: 220,
      damping: 22,
      mass: 0.95,
      overshootClamping: false,
      useNativeDriver: true,
    }).start();
  }, [profileSheetProgress]);

  const closeProfileSheet = React.useCallback(() => {
    profileSheetProgress.stopAnimation();
    Animated.spring(profileSheetProgress, {
      toValue: 0,
      stiffness: 260,
      damping: 28,
      mass: 0.9,
      overshootClamping: true,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsProfileSheetOpen(false);
      }
    });
  }, [profileSheetProgress]);

  const switchTab = React.useCallback(
    (nextTab: AuthTab) => {
      if (nextTab === activeTab || isTabTransitioning) {
        return;
      }

      setPreviousTab(activeTab);
      setIsTabTransitioning(true);
      tabTransitionProgress.stopAnimation();
      tabTransitionProgress.setValue(0);

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
      } else {
        setActiveTab(nextTab);
        setIsPasswordSectionOpen(false);
      }

      Animated.timing(tabTransitionProgress, {
        toValue: 1,
        duration: Platform.OS === 'android' ? 240 : 300,
        easing:
          Platform.OS === 'android'
            ? Easing.out(Easing.cubic)
            : Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsTabTransitioning(false);
        }
      });
    },
    [activeTab, isTabTransitioning, tabTransitionProgress],
  );

  useEffect(() => {
    if (!authNotice) {
      authNoticeOpacity.setValue(0);
      return;
    }

    authNoticeOpacity.stopAnimation();
    authNoticeOpacity.setValue(0);
    Animated.timing(authNoticeOpacity, {
      toValue: 1,
      duration: MESSAGE_FADE_IN_MS,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(authNoticeOpacity, {
        toValue: 0,
        duration: MESSAGE_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setAuthNotice(null);
        }
      });
    }, MESSAGE_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      authNoticeOpacity.stopAnimation();
    };
  }, [authNotice, authNoticeOpacity]);

  useEffect(() => {
    if (!changePasswordError) {
      changePasswordErrorOpacity.setValue(0);
      return;
    }

    changePasswordErrorOpacity.stopAnimation();
    changePasswordErrorOpacity.setValue(0);
    Animated.timing(changePasswordErrorOpacity, {
      toValue: 1,
      duration: MESSAGE_FADE_IN_MS,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(changePasswordErrorOpacity, {
        toValue: 0,
        duration: MESSAGE_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setChangePasswordError(null);
        }
      });
    }, MESSAGE_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      changePasswordErrorOpacity.stopAnimation();
    };
  }, [changePasswordError, changePasswordErrorOpacity]);

  useEffect(() => {
    if (!changePasswordSuccess) {
      changePasswordSuccessOpacity.setValue(0);
      return;
    }

    changePasswordSuccessOpacity.stopAnimation();
    changePasswordSuccessOpacity.setValue(0);
    Animated.timing(changePasswordSuccessOpacity, {
      toValue: 1,
      duration: MESSAGE_FADE_IN_MS,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(changePasswordSuccessOpacity, {
        toValue: 0,
        duration: MESSAGE_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setChangePasswordSuccess(null);
        }
      });
    }, MESSAGE_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      changePasswordSuccessOpacity.stopAnimation();
    };
  }, [changePasswordSuccess, changePasswordSuccessOpacity]);

  useEffect(() => {
    if (!forgotError) {
      forgotErrorOpacity.setValue(0);
      return;
    }

    forgotErrorOpacity.stopAnimation();
    forgotErrorOpacity.setValue(0);
    Animated.timing(forgotErrorOpacity, {
      toValue: 1,
      duration: MESSAGE_FADE_IN_MS,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(forgotErrorOpacity, {
        toValue: 0,
        duration: MESSAGE_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setForgotError(null);
        }
      });
    }, MESSAGE_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      forgotErrorOpacity.stopAnimation();
    };
  }, [forgotError, forgotErrorOpacity]);

  useEffect(() => {
    if (!error) {
      loginErrorOpacity.setValue(0);
      return;
    }

    loginErrorOpacity.stopAnimation();
    loginErrorOpacity.setValue(0);
    Animated.timing(loginErrorOpacity, {
      toValue: 1,
      duration: MESSAGE_FADE_IN_MS,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(loginErrorOpacity, {
        toValue: 0,
        duration: MESSAGE_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          clearError();
        }
      });
    }, MESSAGE_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      loginErrorOpacity.stopAnimation();
    };
  }, [error, errorVersion, loginErrorOpacity, clearError]);

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
    setForgotIdentity('+7');
    setResetCode('');
    setResetNewPassword('');
    updateField('identifier', '+7');
    updateField('password', '');
    setForgotError(null);
    setIsResetPasswordVisible(false);
    setIsForgotSubmitting(false);
    setFocusedForgotField(null);
  };

  useEffect(() => {
    // On any auth session transition (login/logout/account switch),
    // force UI back to the default Home state.
    setActiveTab('home');
    setIsProfileSheetOpen(false);
    profileSheetProgress.stopAnimation();
    profileSheetProgress.setValue(0);
    setIsPasswordSectionOpen(false);
    setOldPassword('');
    setNewPassword('');
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setIsOldPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsPasswordVisible(false);
    setFocusedLoginField(null);
    setFocusedProfileField(null);
  }, [session?.user?.id, session?.accessToken, profileSheetProgress]);

  const sendResetCode = async () => {
    if (isForgotSubmitting || forgotSubmitLockRef.current) {
      return;
    }

    const identity = forgotIdentity.trim();
    if (!identity) {
      setForgotError('Введите номер телефона');
      return;
    }

    forgotSubmitLockRef.current = true;
    setIsForgotSubmitting(true);
    try {
      await authApi.forgotPassword({ identity });
      setIsCodeSent(true);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Не удалось отправить код';
      setForgotError(message);
    } finally {
      setIsForgotSubmitting(false);
      forgotSubmitLockRef.current = false;
    }
  };

  const submitResetPassword = async () => {
    if (isForgotSubmitting || forgotSubmitLockRef.current) {
      return;
    }

    const identity = forgotIdentity.trim();
    const code = resetCode.trim();
    const newPass = resetNewPassword.trim();

    if (!identity) {
      setForgotError('Введите номер телефона');
      return;
    }

    if (!code || !newPass) {
      setForgotError('Заполните номер телефона, код и новый пароль');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setForgotError('Код должен состоять из 6 цифр');
      return;
    }

    const resetPasswordPolicyError = validateStrongPassword(newPass);
    if (resetPasswordPolicyError) {
      setForgotError(resetPasswordPolicyError);
      return;
    }

    forgotSubmitLockRef.current = true;
    setIsForgotSubmitting(true);
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
      forgotSubmitLockRef.current = false;
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

    const changePasswordPolicyError = validateStrongPassword(newPass);
    if (changePasswordPolicyError) {
      setChangePasswordError(changePasswordPolicyError);
      setChangePasswordSuccess(null);
      return;
    }

    if (oldPass === newPass) {
      setChangePasswordError('Новый пароль должен отличаться от старого');
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
    const profileEmail = session.user.email || 'Почта не указана';
    const profileLetter = (session.user.email?.trim()?.charAt(0) || 'П').toUpperCase();
    const profileStatusBarStyle =
      isAndroid && androidPalette
        ? getAndroidStatusBarStyle(String(androidPalette.background))
        : 'light-content';
    const isAndroidMaterialMode = isAndroid && androidTheme.mode === 'material';
    const isAndroidMaterialDark = isAndroidMaterialMode && colorScheme === 'dark';
    const androidTabThemeMode =
      isAndroidMaterialMode && !isAndroidMaterialDark ? 'light' : 'dark';
    const androidTabActiveBackground =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? String(androidPalette.primaryContainerStrong)
          : isAndroidMaterialDark
            ? String(androidPalette.surfaceAccent)
            : String(androidPalette.primaryContainer)
        : undefined;
    const androidTabActiveForeground =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? String(androidPalette.onSurface)
          : isAndroidMaterialDark
            ? String(androidPalette.onSurface)
            : String(androidPalette.primaryStrong)
        : undefined;
    const androidTabInactiveForeground =
      isAndroid && androidPalette
        ? isAndroidMaterialDark
          ? '#B7C0C9'
          : String(androidPalette.onSurfaceMuted)
        : undefined;
    const androidTabShellBackground =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? String(androidPalette.surfaceRaised)
          : isAndroidMaterialDark
            ? 'rgba(18,22,26,0.92)'
            : 'rgba(251,252,254,0.94)'
        : undefined;
    const androidTabShellBorder =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? String(androidPalette.primaryContainerStrong)
          : String(androidPalette.outlineVariant)
        : undefined;

    const showProfile = activeTab === 'profile';
    const showMail = activeTab === 'mail';
    const showTrash = activeTab === 'trash';
    const profileOverlayOpacity = profileSheetProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.32],
      extrapolate: 'clamp',
    });
    const profileSheetTranslateY = profileSheetProgress.interpolate({
      inputRange: [0, 0.72, 1],
      outputRange: [SCREEN_HEIGHT, 24, 0],
      extrapolate: 'clamp',
    });
    const profileSheetScale = profileSheetProgress.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.94, 0.985, 1],
      extrapolate: 'clamp',
    });
    const tabIndexMap: Record<AuthTab, number> = {
      home: 0,
      mail: 1,
      trash: 2,
      profile: 3,
    };
    const previousIndex = tabIndexMap[previousTab];
    const activeIndex = tabIndexMap[activeTab];
    const direction = activeIndex > previousIndex ? 1 : -1;
    const travelDistance = Platform.OS === 'android' ? SCREEN_WIDTH * 0.045 : SCREEN_WIDTH * 0.14;

    const createTabAnimatedStyle = (tab: AuthTab) => {
      const isIncoming = tab === activeTab;
      const isOutgoing = tab === previousTab && isTabTransitioning;
      const isStaticActive = tab === activeTab && !isTabTransitioning;

      if (isStaticActive) {
        return {
          opacity: 1,
          zIndex: 3,
          transform: [{ translateX: 0 }],
        };
      }

      if (isIncoming) {
        return {
          opacity: tabTransitionProgress.interpolate({
            inputRange: [0, 0.12, 1],
            outputRange: [0, Platform.OS === 'android' ? 0.22 : 0.1, 1],
            extrapolate: 'clamp',
          }),
          zIndex: 3,
          transform: [
            {
              translateX: tabTransitionProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [direction * travelDistance, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      }

      if (isOutgoing) {
        return {
          opacity: tabTransitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, Platform.OS === 'android' ? 0 : 0],
            extrapolate: 'clamp',
          }),
          zIndex: 2,
          transform: [
            {
              translateX: tabTransitionProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Platform.OS === 'android' ? -direction * travelDistance * 0.35 : -direction * travelDistance * 0.7],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      }

      return {
        opacity: 0,
        zIndex: 0,
        transform: [{ translateX: 0 }],
      };
    };

    const homeTabAnimatedStyle = createTabAnimatedStyle('home');
    const mailTabAnimatedStyle = createTabAnimatedStyle('mail');
    const trashTabAnimatedStyle = createTabAnimatedStyle('trash');
    const profileTabAnimatedStyle = createTabAnimatedStyle('profile');

    return (
      <View style={styles.authenticatedScreen}>
        <Animated.View
          style={[styles.homeLayer, homeTabAnimatedStyle]}
          renderToHardwareTextureAndroid
          pointerEvents={activeTab === 'home' ? 'auto' : 'none'}>
          <HomeScreenRouter
            session={session}
            isRefreshingSession={isRefreshingSession}
            onLogout={() => {
              resetChangePasswordForm();
              setActiveTab('home');
              resetSession();
            }}
            onRefreshSession={refreshSession}
            onGoHome={() => setActiveTab('home')}
            onGoMail={() => setActiveTab('mail')}
            onGoTrash={() => setActiveTab('trash')}
            onGoProfile={openProfileSheet}
            activeTab={activeTab === 'home' ? 'home' : activeTab}
            showHeaderActions={false}
            showTabBar={false}
          />
        </Animated.View>

        <Animated.View
          style={[styles.tabLayer, mailTabAnimatedStyle]}
          renderToHardwareTextureAndroid
          pointerEvents={showMail ? 'auto' : 'none'}>
          <CertificatesScreen employeeId={session.user.id} />
          </Animated.View>

        <Animated.View
          style={[styles.tabLayer, trashTabAnimatedStyle]}
          renderToHardwareTextureAndroid
          pointerEvents={showTrash ? 'auto' : 'none'}>
            {isAndroid ? (
              <SafeAreaView
                style={[styles.authenticatedScreen, { backgroundColor: '#000000' }]}
                edges={['top', 'bottom']}>
                <View style={styles.comingSoonWrap}>
                  <Image
                    source={lockIcon}
                    defaultSource={lockIcon}
                    fadeDuration={0}
                    style={styles.comingSoonIcon}
                  />
                  <Text style={styles.comingSoonText}>Этот раздел еще не доступен</Text>
                </View>
              </SafeAreaView>
            ) : (
              <View style={[styles.authenticatedScreen, { backgroundColor: '#000000' }]} />
            )}
          </Animated.View>

        {!isAndroid ? (
          <View
            pointerEvents="none"
            style={[
              styles.iosComingSoonOverlay,
              { opacity: showTrash ? 1 : 0 },
            ]}>
            <View style={styles.comingSoonWrap}>
              <Image
                source={lockIcon}
                defaultSource={lockIcon}
                fadeDuration={0}
                style={styles.comingSoonIcon}
              />
              <Text style={styles.comingSoonText}>Этот раздел еще не доступен</Text>
            </View>
          </View>
        ) : null}

        {!isAndroid && showTrash ? (
          <View pointerEvents="box-none" style={styles.iosFloatingHeaderWrap}>
              <View
                style={[
                  styles.tabHeaderContainer,
                  styles.iosFloatingHeaderContainer,
                  { paddingTop: insets.top + 25 },
                ]}>
              <View
                style={[
                  styles.tabHeaderRow,
                  styles.tabHeaderRowIosOnly,
                  styles.iosFloatingHeaderRow,
                ]}
              />
            </View>
          </View>
        ) : null}

        <Animated.View
          style={[styles.tabLayer, profileTabAnimatedStyle]}
          renderToHardwareTextureAndroid
          pointerEvents={showProfile ? 'auto' : 'none'}>
            <SafeAreaView
              style={[
                styles.authenticatedScreen,
                {
                  backgroundColor:
                    isAndroid && androidPalette
                      ? String(androidPalette.background)
                      : '#000000',
                },
              ]}
              edges={['top', 'bottom']}>
              <StatusBar barStyle={profileStatusBarStyle} />
              <MoreScreen
                employeeId={session.user.id}
              />
            </SafeAreaView>
          </Animated.View>

        {isProfileSheetOpen ? (
          <View style={styles.profileSheetRoot} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeProfileSheet}>
              <Animated.View style={[styles.profileSheetBackdrop, { opacity: profileOverlayOpacity }]} />
            </Pressable>

            <Animated.View
              style={[
                styles.profileSheetCard,
                {
                  top: insets.top + 6,
                  transform: [
                    { translateY: profileSheetTranslateY },
                    { scale: profileSheetScale },
                  ],
                },
              ]}>
              <TouchableOpacity
                style={styles.profileSheetCloseButton}
                onPress={closeProfileSheet}
                accessibilityRole="button"
                accessibilityLabel="Закрыть профиль">
                <Image source={crossIcon} style={styles.profileSheetCloseIcon} />
              </TouchableOpacity>

              <SafeAreaView style={styles.profileSheetSafeArea} edges={['top', 'bottom']}>
                <View style={styles.profileSheetContent}>
                  <View style={styles.profileAccountCard}>
                    <View style={styles.profileAccountRow}>
                      <View style={styles.profileAvatarCircle}>
                        <Text style={styles.profileAvatarLetter}>{profileLetter}</Text>
                      </View>
                      <View style={styles.profileIdentityBlock}>
                        <Text style={styles.profileAccountName}>{displayName}</Text>
                        <Text style={styles.profileAccountEmail}>{profileEmail}</Text>
                      </View>
                    </View>
                  </View>

                  {!isPasswordSectionOpen ? (
                    <View style={styles.profileActionsCard}>
                      <TouchableOpacity
                        style={styles.profileRowButton}
                        onPress={() => {
                          setIsPasswordSectionOpen(true);
                          setChangePasswordError(null);
                          setChangePasswordSuccess(null);
                        }}
                        disabled={isChangingPassword}>
                        <Text style={styles.profileRowButtonText}>Смена пароля</Text>
                        <Text style={styles.profileRowChevron}>›</Text>
                      </TouchableOpacity>

                      <View style={styles.profileDivider} />

                      <View style={styles.profileRowStatic}>
                        <Text style={styles.profileRowMutedText}>Тут скоро что-то будет</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.profilePasswordCard}>
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
                            }>
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
                            }>
                            <Image
                              source={isNewPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
                              style={styles.eyeImage}
                            />
                          </TouchableOpacity>
                        </View>

                        {changePasswordError ? (
                          <Animated.View
                            style={[
                              styles.flashMessage,
                              styles.flashMessageError,
                              { opacity: changePasswordErrorOpacity },
                            ]}>
                            <View style={styles.flashMessageLeft}>
                              <View style={[styles.flashIconCircle, styles.flashIconCircleError]}>
                                <Text style={styles.flashIconText}>!</Text>
                              </View>
                              <Text style={styles.flashMessageText}>{changePasswordError}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.flashCloseButton}
                              onPress={() => setChangePasswordError(null)}
                              accessibilityRole="button"
                              accessibilityLabel="Закрыть сообщение об ошибке">
                              <Text style={styles.flashCloseText}>✕</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        ) : null}
                        {changePasswordSuccess ? (
                          <Animated.View
                            style={[
                              styles.flashMessage,
                              styles.flashMessageSuccess,
                              { opacity: changePasswordSuccessOpacity },
                            ]}>
                            <View style={styles.flashMessageLeft}>
                              <View style={[styles.flashIconCircle, styles.flashIconCircleSuccess]}>
                                <Text style={styles.flashIconText}>✓</Text>
                              </View>
                              <Text style={styles.flashMessageText}>{changePasswordSuccess}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.flashCloseButton}
                              onPress={() => setChangePasswordSuccess(null)}
                              accessibilityRole="button"
                              accessibilityLabel="Закрыть сообщение об успехе">
                              <Text style={styles.flashCloseText}>✕</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.button, styles.logoutButton]}
                          onPress={submitChangePassword}
                          disabled={isChangingPassword}>
                          {isChangingPassword ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text style={styles.buttonText}>Сохранить пароль</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={resetChangePasswordForm}
                          disabled={isChangingPassword}>
                          <Text style={styles.linkButtonText}>Назад в профиль</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.profileBottomBlock}>
                    <TouchableOpacity
                      style={styles.profileLogoutButton}
                      onPress={() => {
                        resetChangePasswordForm();
                        closeProfileSheet();
                        setActiveTab('home');
                        resetSession();
                      }}>
                      <Text style={styles.profileLogoutButtonText}>Выйти</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </SafeAreaView>
            </Animated.View>
          </View>
        ) : null}

        <View style={StyleSheet.absoluteFillObject}>
          <LiquidTabBar
            activeTab={activeTab}
            onTabChange={switchTab}
            homeIcon={homeIcon}
            profileIcon={profileIcon}
            profileLabel="Ещё"
            themeMode={androidTabThemeMode}
            activeTintColor={
              isAndroid && androidPalette ? String(androidPalette.primary) : undefined
            }
            activeBackgroundColor={androidTabActiveBackground}
            activeForegroundColor={androidTabActiveForeground}
            inactiveTintColor={androidTabInactiveForeground}
            shellBackgroundColor={androidTabShellBackground}
            shellBorderColor={androidTabShellBorder}
            mailIcon={mailIcon}
            trashIcon={trashIcon}
          />
        </View>
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
                placeholder="Номер телефона"
                placeholderTextColor="#7A7A7A"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                value={forgotIdentity}
                selection={forgotPhoneSelection}
                onFocus={() => {
                  setFocusedForgotField('identity');
                  const caret = forgotIdentity.length;
                  setForgotPhoneSelection({ start: caret, end: caret });
                }}
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
                  setForgotIdentity(prev => {
                    const nextValue = formatPhoneInputWithBackspace(prev, text);
                    const caret = nextValue.length;
                    setForgotPhoneSelection({ start: caret, end: caret });
                    return nextValue;
                  });
                  if (forgotError) {
                    setForgotError(null);
                  }
                }}
                editable={!isForgotSubmitting}
              />
            ) : null}

            <View style={styles.forgotFlashSlot}>
              {forgotError ? (
                <Animated.View
                  style={[
                    styles.flashMessage,
                    styles.flashMessageError,
                    { opacity: forgotErrorOpacity },
                  ]}>
                  <View style={styles.flashMessageLeft}>
                    <View style={[styles.flashIconCircle, styles.flashIconCircleError]}>
                      <Text style={styles.flashIconText}>!</Text>
                    </View>
                    <Text style={styles.flashMessageText}>{forgotError}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.flashCloseButton}
                    onPress={() => setForgotError(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Закрыть сообщение об ошибке">
                    <Text style={styles.flashCloseText}>✕</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : null}
            </View>

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
          placeholder="Номер телефона"
          placeholderTextColor="#7A7A7A"
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          inputAccessoryViewID={Platform.OS === 'ios' ? authAccessoryId : undefined}
          returnKeyType="next"
          value={form.identifier}
          selection={loginPhoneSelection}
          onChangeText={text => {
            const nextValue = formatPhoneInputWithBackspace(form.identifier, text);
            updateField('identifier', nextValue);
            const caret = nextValue.length;
            setLoginPhoneSelection({ start: caret, end: caret });
            if (authNotice) {
              setAuthNotice(null);
            }
          }}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          onFocus={() => {
            setFocusedLoginField('identifier');
            const caret = form.identifier.length;
            setLoginPhoneSelection({ start: caret, end: caret });
          }}
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
          <Animated.View
            style={[
              styles.flashMessage,
              styles.flashMessageSuccess,
              { opacity: authNoticeOpacity },
            ]}>
            <View style={styles.flashMessageLeft}>
              <View style={[styles.flashIconCircle, styles.flashIconCircleSuccess]}>
                <Text style={styles.flashIconText}>✓</Text>
              </View>
              <Text style={styles.flashMessageText}>{authNotice}</Text>
            </View>
            <TouchableOpacity
              style={styles.flashCloseButton}
              onPress={() => setAuthNotice(null)}
              accessibilityRole="button"
              accessibilityLabel="Закрыть сообщение об успехе">
              <Text style={styles.flashCloseText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {error ? (
          <Animated.View
            style={[
              styles.flashMessage,
              styles.flashMessageError,
              { opacity: loginErrorOpacity },
            ]}>
            <View style={styles.flashMessageLeft}>
              <View style={[styles.flashIconCircle, styles.flashIconCircleError]}>
                <Text style={styles.flashIconText}>!</Text>
              </View>
              <Text style={styles.flashMessageText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.flashCloseButton}
              onPress={clearError}
              accessibilityRole="button"
              accessibilityLabel="Закрыть сообщение об ошибке">
              <Text style={styles.flashCloseText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

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
            setForgotIdentity('+7');
            updateField('identifier', '+7');
            updateField('password', '');
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
