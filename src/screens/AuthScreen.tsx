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
  PlatformColor,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedEntranceView from '../components/AnimatedEntranceView';
import { styles } from './AuthScreen.styles';
import { useAuth } from '../features/auth/useAuth';
import MoreScreen from './MoreScreen';
import CertificatesScreen from './CertificatesScreen';
import HomeScreenRouter from './HomeScreenRouter';
import ProductInfoScreen from './ProductInfoScreen';
import { authApi } from '../features/auth/authApi';
import { buildApiUrl } from '../config/api';
import LiquidTabBar from '../components/LiquidTabBar';
import type { TabKey } from '../components/LiquidTabBar';
import type { OpenedShift } from '../features/shift/types';
import { useAndroidThemeMode } from '../theme/androidAppTheme';
import {
  getAndroidCompanyPalette,
  getAndroidStatusBarColor,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors';
import {
  androidLightImpact,
  androidMediumImpact,
  androidSuccessHaptic,
} from '../utils/androidHaptics';

const eyeOpenIcon = require('../assets/icons/eye-open.png');
const eyeClosedIcon = require('../assets/icons/eye-closed.png');
const homeIcon = require('../assets/icons/home.png');
const profileIcon = require('../assets/icons/more.png');
const mailIcon = require('../assets/icons/gift.png');
const trashIcon = require('../assets/icons/shop.png');
const crossIcon = require('../assets/icons/cross.png');

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
  if (p1) out += ` ${p1}`;
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;

  return out;
}

function formatLocalPhoneDisplay(value: string) {
  const local = extractLocalPhoneDigits(value);

  if (!local) {
    return '';
  }

  const p1 = local.slice(0, 3);
  const p2 = local.slice(3, 6);
  const p3 = local.slice(6, 8);
  const p4 = local.slice(8, 10);

  let out = '';
  if (p1) out += p1;
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;

  return out;
}

function formatLocalPhoneInputWithBackspace(prevValue: string, nextValue: string) {
  const prevLocal = extractLocalPhoneDigits(prevValue);
  const nextLocal = extractLocalPhoneDigits(nextValue);

  if (nextLocal.length > 10) {
    return formatLocalPhoneDisplay(prevLocal);
  }

  if (nextValue.length < prevValue.length && nextLocal.length === prevLocal.length) {
    return formatLocalPhoneDisplay(prevLocal.slice(0, -1));
  }

  return formatLocalPhoneDisplay(nextLocal);
}

function extractLocalPhoneDigits(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return (digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits).slice(0, 10);
}

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const androidTheme = useAndroidThemeMode();
  const isAndroid = Platform.OS === 'android';
  const androidPalette = isAndroid
    ? androidTheme.mode === 'company'
      ? getAndroidCompanyPalette()
      : getAndroidThemePalette(colorScheme === 'dark', androidTheme.contrastMode)
    : null;
  const authAccessoryId = 'auth-keyboard-accessory';
  const insets = useSafeAreaInsets();
  const loginPhoneInputRef = useRef<TextInput>(null);
  const forgotPhoneInputRef = useRef<TextInput>(null);
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
  const [loginPhoneSelection, setLoginPhoneSelection] = useState({ start: 0, end: 0 });
  const [focusedForgotField, setFocusedForgotField] = useState<
    'identity' | 'code' | 'newPassword' | null
  >(null);
  const [forgotPhoneSelection, setForgotPhoneSelection] = useState({ start: 0, end: 0 });
  const [activeTab, setActiveTab] = useState<AuthTab>('home');
  const [openedShift, setOpenedShift] = useState<OpenedShift | null>(null);
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
  const [profileNotificationsCount, setProfileNotificationsCount] = useState(0);
  const [isProfileNotificationsLoading, setIsProfileNotificationsLoading] = useState(false);
  const profileSheetProgress = useRef(new Animated.Value(0)).current;
  const tabTransitionProgress = useRef(new Animated.Value(1)).current;
  const activeTabRef = useRef<AuthTab>('home');
  const isTabTransitioningRef = useRef(false);
  const tabTransitionTokenRef = useRef(0);
  const authKeyboardShift = useRef(new Animated.Value(0)).current;
  const authNoticeOpacity = useRef(new Animated.Value(0)).current;
  const forgotErrorOpacity = useRef(new Animated.Value(0)).current;
  const loginErrorOpacity = useRef(new Animated.Value(0)).current;
  const changePasswordErrorOpacity = useRef(new Animated.Value(0)).current;
  const changePasswordSuccessOpacity = useRef(new Animated.Value(0)).current;
  const authScreenReveal = useRef(new Animated.Value(0)).current;
  const appShellReveal = useRef(new Animated.Value(0)).current;
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

  const authIsMaterial = isAndroid && androidTheme.mode === 'material';
  const supportsMaterialSystemColors = isAndroid && authIsMaterial && Number(Platform.Version) >= 31;
  const authBackgroundHex =
    isAndroid && androidPalette
      ? androidTheme.mode === 'company'
        ? '#000000'
        : getAndroidStatusBarColor(colorScheme === 'dark')
      : '#000000';
  const authBackground =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral1_900'
            : '@android:color/system_neutral1_10',
        )
      : authBackgroundHex;
  const authSurfaceMuted =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral1_800'
            : '@android:color/system_neutral1_0',
        )
      : isAndroid && androidPalette
        ? authIsMaterial
          ? String(androidPalette.surfaceRaised)
          : String(androidPalette.surface)
        : '#1A1A1A';
  const authBorder =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral2_700'
            : '@android:color/system_neutral2_200',
        )
      : isAndroid && androidPalette
        ? androidTheme.mode === 'company'
          ? String(androidPalette.primaryContainerStrong)
          : String(androidPalette.outline)
        : '#2B2B2B';
  const authText =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral1_50'
            : '@android:color/system_neutral1_900',
        )
      : isAndroid && androidPalette
        ? String(androidPalette.onSurface)
        : '#FFFFFF';
  const authMutedText =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral2_200'
            : '@android:color/system_neutral2_700',
        )
      : isAndroid && androidPalette
        ? String(androidPalette.onSurfaceMuted)
        : '#A6A6A6';
  const authPlaceholder = authMutedText;
  const authAccent =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_accent1_300'
            : '@android:color/system_accent1_500',
        )
      : isAndroid && androidPalette
        ? String(androidPalette.primary)
        : '#FF6A00';
  const authOnAccent =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral1_50'
            : '@android:color/system_neutral1_900',
        )
      : isAndroid && androidPalette
        ? authIsMaterial
          ? String(androidPalette.primaryStrong)
          : String(androidPalette.buttonText)
        : '#FFFFFF';
  const authButtonBackground =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_accent1_800'
            : '@android:color/system_accent1_100',
        )
      : isAndroid && androidPalette && authIsMaterial
        ? String(androidPalette.primaryContainerStrong)
        : authAccent;
  const authButtonBorder =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_accent1_700'
            : '@android:color/system_accent1_200',
        )
      : isAndroid && androidPalette && authIsMaterial
        ? String(androidPalette.primaryContainer)
        : authAccent;
  const authBrandGlow =
    isAndroid && androidTheme.mode === 'material'
      ? colorScheme === 'dark'
        ? 'rgba(169,184,255,0.18)'
        : 'rgba(79,110,232,0.18)'
      : 'rgba(255,106,0,0.16)';
  const authBrandCapsuleBackground =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral1_800'
            : '@android:color/system_neutral1_0',
        )
      : isAndroid && androidPalette && authIsMaterial
        ? String(androidPalette.surfaceRaised)
      : '#111111';
  const authBrandCapsuleBorder =
    supportsMaterialSystemColors
      ? PlatformColor(
          colorScheme === 'dark'
            ? '@android:color/system_neutral2_700'
            : '@android:color/system_neutral2_200',
        )
      : isAndroid && androidPalette && authIsMaterial
        ? String(androidPalette.outlineVariant)
      : 'rgba(255,255,255,0.08)';
  const authInputFocusedStyle = {
    borderColor: authAccent,
    borderWidth: 1,
    shadowColor: authAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  };
  const authStatusBarStyle = getAndroidStatusBarStyle(authBackgroundHex);
  const [isAuthKeyboardVisible, setIsAuthKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isAndroid) {
      authScreenReveal.setValue(1);
      return;
    }

    if (session) {
      authScreenReveal.setValue(0);
      return;
    }

    if (androidTheme.shouldShowIntro) {
      authScreenReveal.setValue(0);
      return;
    }

    authScreenReveal.stopAnimation();
    authScreenReveal.setValue(0);
    Animated.parallel([
      Animated.timing(authScreenReveal, {
        toValue: 1,
        duration: 420,
        easing: Easing.bezier(0.2, 0.86, 0.24, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [androidTheme.shouldShowIntro, authScreenReveal, isAndroid, session]);

  useEffect(() => {
    if (!isAndroid) {
      appShellReveal.setValue(1);
      return;
    }

    if (!session) {
      appShellReveal.setValue(0);
      return;
    }

    appShellReveal.stopAnimation();
    appShellReveal.setValue(0);
    Animated.parallel([
      Animated.timing(appShellReveal, {
        toValue: 1,
        duration: 460,
        easing: Easing.bezier(0.18, 0.84, 0.22, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [appShellReveal, isAndroid, session]);

  useEffect(() => {
    if (!isAndroid || session) {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      setIsAuthKeyboardVisible(true);
      const height = event.endCoordinates?.height ?? 0;
      Animated.spring(authKeyboardShift, {
        toValue: -Math.min(height * 0.18, 74),
        stiffness: 210,
        damping: 24,
        mass: 0.92,
        useNativeDriver: true,
      }).start();
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsAuthKeyboardVisible(false);
      Animated.spring(authKeyboardShift, {
        toValue: 0,
        stiffness: 220,
        damping: 26,
        mass: 0.94,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [authKeyboardShift, isAndroid, session]);

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

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const applyTabSelection = React.useCallback((nextTab: AuthTab) => {
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
    activeTabRef.current = nextTab;
  }, []);

  const switchTab = React.useCallback(
    (nextTab: AuthTab) => {
      const currentTab = activeTabRef.current;
      if (nextTab === currentTab) {
        return;
      }

      const transitionToken = tabTransitionTokenRef.current + 1;
      tabTransitionTokenRef.current = transitionToken;
      setPreviousTab(currentTab);
      setIsTabTransitioning(true);
      isTabTransitioningRef.current = true;
      tabTransitionProgress.stopAnimation();
      tabTransitionProgress.setValue(0);
      applyTabSelection(nextTab);

      Animated.timing(tabTransitionProgress, {
        toValue: 1,
        duration: Platform.OS === 'android' ? 280 : 300,
        easing:
          Platform.OS === 'android'
            ? Easing.bezier(0.22, 0.92, 0.24, 1)
            : Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && tabTransitionTokenRef.current === transitionToken) {
          setIsTabTransitioning(false);
          isTabTransitioningRef.current = false;
        }
      });
    },
    [applyTabSelection, tabTransitionProgress],
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
    if (!session || !isProfileSheetOpen || Number(session.user.userRole ?? 3) !== 10) {
      return;
    }

    const employeeId = session.user.id;
    let isMounted = true;

    async function loadProfileNotificationsCount() {
      setIsProfileNotificationsLoading(true);

      try {
        const res = await fetch(
          buildApiUrl(`/employees/${encodeURIComponent(employeeId)}/hr/regions`),
        );

        if (res.status === 404 || res.status === 501) {
          if (isMounted) {
            setProfileNotificationsCount(0);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`HR regions HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          regions?: Array<{
            employee_count?: number | null;
            shop_count?: number | null;
          }>;
        };

        const nextCount = Array.isArray(data.regions)
          ? data.regions.filter(region => {
              const employeeCount = Number(region.employee_count ?? 0);
              const shopCount = Number(region.shop_count ?? 0);
              return employeeCount > 0 || shopCount > 0;
            }).length
          : 0;

        if (isMounted) {
          setProfileNotificationsCount(nextCount);
        }
      } catch {
        if (isMounted) {
          setProfileNotificationsCount(0);
        }
      } finally {
        if (isMounted) {
          setIsProfileNotificationsLoading(false);
        }
      }
    }

    loadProfileNotificationsCount();

    return () => {
      isMounted = false;
    };
  }, [isProfileSheetOpen, session]);

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

  const resetChangePasswordForm = React.useCallback(() => {
    setOldPassword('');
    setNewPassword('');
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setIsOldPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setFocusedProfileField(null);
    setIsPasswordSectionOpen(false);
  }, []);

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
    // On login/logout/account switch, force UI back to the default Home state.
    // Do not reset on token refresh, otherwise pull-to-refresh inside tabs
    // kicks the user back to Home.
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
  }, [session?.user?.id, profileSheetProgress]);

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
    const isHrManager = Number(session.user.userRole ?? 3) === 10;
    const profileStatusBarStyle =
      isAndroid && androidPalette
        ? getAndroidStatusBarStyle(
            androidTheme.mode === 'company'
              ? '#000000'
              : getAndroidStatusBarColor(colorScheme === 'dark'),
          )
        : 'light-content';
    const isAndroidMaterialMode = isAndroid && androidTheme.mode === 'material';
    const isAndroidMaterialDark = isAndroidMaterialMode && colorScheme === 'dark';
    const androidTabThemeMode = 'dark';
    const androidTabActiveBackground =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? 'rgba(120,70,39,0.58)'
          : isAndroidMaterialDark
            ? 'rgba(255,255,255,0.14)'
            : 'rgba(255,255,255,0.16)'
        : undefined;
    const androidTabActivePillSolid =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? 'rgba(58,36,24,0.96)'
          : undefined
        : undefined;
    const androidTabActiveForeground =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? '#FFF4EC'
          : isAndroidMaterialDark
            ? '#FFFFFF'
            : '#FFFFFF'
        : undefined;
    const androidTabInactiveForeground =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? 'rgba(255,237,226,0.76)'
          : isAndroidMaterialDark
            ? 'rgba(235,241,247,0.78)'
            : 'rgba(235,241,247,0.74)'
        : undefined;
    const androidTabShellBackground =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? 'rgba(22,16,12,0.14)'
          : 'rgba(13,16,19,0.18)'
        : undefined;
    const androidTabShellBorder =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? 'rgba(255,140,56,0.16)'
          : 'rgba(255,255,255,0.09)'
        : undefined;
    const profileSheetSurface =
      isAndroid && androidPalette
        ? isAndroidMaterialDark
          ? androidPalette.background
          : androidPalette.surfaceRaised
        : '#1C1C1E';
    const profileSurface =
      isAndroid && androidPalette
        ? isAndroidMaterialDark
          ? androidPalette.surfaceRaised
          : androidPalette.surfaceRaised
        : '#1C1C1E';
    const profileSurfaceMuted =
      isAndroid && androidPalette
        ? isAndroidMaterialDark
          ? androidPalette.surfaceAccent
          : androidPalette.surfaceMuted
        : '#151515';
    const profileSurfaceAccent =
      isAndroid && androidPalette
        ? isAndroidMaterialDark
          ? androidPalette.surfaceMuted
          : androidPalette.surfaceAccent
        : '#3A3A3C';
    const profileBorder =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? androidPalette.primaryContainerStrong
          : isAndroidMaterialDark
            ? androidPalette.outline
            : androidPalette.outlineVariant
        : '#2C2C2E';
    const profileText =
      isAndroid && androidPalette ? androidPalette.onSurface : '#F2F2F7';
    const profileMutedText =
      isAndroid && androidPalette ? androidPalette.onSurfaceMuted : '#8E8E93';
    const profileAccent =
      isAndroid && androidPalette
        ? isAndroid && androidTheme.mode === 'company'
          ? androidPalette.primary
          : isAndroidMaterialDark
            ? androidPalette.primaryStrong
            : androidPalette.primary
        : '#FF6A00';

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
    const travelDistance =
      Platform.OS === 'android'
        ? SCREEN_WIDTH * 0.125
        : SCREEN_WIDTH * 0.14;

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
        if (Platform.OS === 'android') {
          return {
            opacity: tabTransitionProgress.interpolate({
              inputRange: [0, 0.26, 1],
              outputRange: [0.1, 0.48, 1],
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
              {
                scale: tabTransitionProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.992, 1],
                  extrapolate: 'clamp',
                }),
              },
            ],
          };
        }

        return {
          opacity: tabTransitionProgress.interpolate({
            inputRange: [0, 0.12, 1],
            outputRange: [0, 0.1, 1],
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
        if (Platform.OS === 'android') {
          return {
            opacity: tabTransitionProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.22],
              extrapolate: 'clamp',
            }),
            zIndex: 2,
            transform: [
              {
                translateX: tabTransitionProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -direction * travelDistance * 0.58],
                  extrapolate: 'clamp',
                }),
              },
              {
                scale: tabTransitionProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.988],
                  extrapolate: 'clamp',
                }),
              },
            ],
          };
        }

        return {
          opacity: tabTransitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
            extrapolate: 'clamp',
          }),
          zIndex: 2,
          transform: [
            {
              translateX: tabTransitionProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -direction * travelDistance * 0.7],
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
    const androidTabTransitionVeilStyle =
      isAndroid && isTabTransitioning
        ? {
            opacity: tabTransitionProgress.interpolate({
              inputRange: [0, 0.24, 1],
              outputRange: [0.018, 0.014, 0],
              extrapolate: 'clamp',
            }),
          }
        : undefined;
    const appShellAnimatedStyle = isAndroid
      ? {
          opacity: appShellReveal,
          transform: [
            {
              translateY: appShellReveal.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
                extrapolate: 'clamp',
              }),
            },
            {
              scale: appShellReveal.interpolate({
                inputRange: [0, 1],
                outputRange: [0.992, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        }
      : undefined;
    return (
      <Animated.View style={[styles.authenticatedScreen, appShellAnimatedStyle]}>
        <Animated.View
          style={[styles.homeLayer, homeTabAnimatedStyle]}
          pointerEvents={activeTab === 'home' ? 'auto' : 'none'}>
          <HomeScreenRouter
            session={session}
            isRefreshingSession={isRefreshingSession}
            onShiftStatusChange={setOpenedShift}
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
          pointerEvents={showMail ? 'auto' : 'none'}>
          <CertificatesScreen
            employeeId={session.user.id}
            isActive={showMail}
            isShiftOpen={openedShift ? true : false}
            currentShopName={openedShift?.shopName ?? null}
          />
          </Animated.View>

        <Animated.View
          style={[styles.tabLayer, trashTabAnimatedStyle]}
          pointerEvents={showTrash ? 'auto' : 'none'}>
          <ProductInfoScreen
            session={session}
            isRefreshing={isRefreshingSession}
            onRefresh={refreshSession}
          />
          </Animated.View>

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
          pointerEvents={showProfile ? 'auto' : 'none'}>
            <SafeAreaView
              style={[
                styles.authenticatedScreen,
                {
                  backgroundColor:
                    isAndroid && androidPalette
                      ? androidTheme.mode === 'company'
                        ? '#000000'
                        : androidPalette.background
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

        {isAndroid && isTabTransitioning ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                zIndex: 4,
                backgroundColor:
                  androidTheme.mode === 'company'
                    ? 'rgba(0,0,0,0.92)'
                    : colorScheme === 'dark'
                      ? 'rgba(8,10,12,0.94)'
                      : 'rgba(245,248,252,0.92)',
              },
              androidTabTransitionVeilStyle,
            ]}
          />
        ) : null}

        {isProfileSheetOpen ? (
          <View style={styles.profileSheetRoot} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeProfileSheet}>
              <Animated.View style={[styles.profileSheetBackdrop, { opacity: profileOverlayOpacity }]} />
            </Pressable>

            <Animated.View
              style={[
                styles.profileSheetCard,
                {
                  backgroundColor: profileSheetSurface,
                  borderColor: profileBorder,
                  top: insets.top + 6,
                  transform: [
                    { translateY: profileSheetTranslateY },
                    { scale: profileSheetScale },
                  ],
                },
              ]}>
              <TouchableOpacity
                style={[
                  styles.profileSheetCloseButton,
                  {
                    backgroundColor: profileSurfaceAccent,
                    borderColor: profileBorder,
                  },
                ]}
                onPress={closeProfileSheet}
                accessibilityRole="button"
                accessibilityLabel="Закрыть профиль">
                <Image source={crossIcon} style={styles.profileSheetCloseIcon} />
              </TouchableOpacity>

              <SafeAreaView style={styles.profileSheetSafeArea} edges={['top', 'bottom']}>
                <View style={styles.profileSheetContent}>
                  <View
                    style={[
                      styles.profileAccountCard,
                      {
                        backgroundColor: profileSurface,
                        borderColor: profileBorder,
                      },
                    ]}>
                    <View style={styles.profileAccountRow}>
                      <View
                        style={[
                          styles.profileAvatarCircle,
                          {
                            backgroundColor: profileSurfaceMuted,
                            borderColor: profileBorder,
                          },
                        ]}>
                        <Text style={[styles.profileAvatarLetter, { color: profileText }]}>{profileLetter}</Text>
                      </View>
                      <View style={styles.profileIdentityBlock}>
                        <Text style={[styles.profileAccountName, { color: profileText }]}>{displayName}</Text>
                        <Text style={[styles.profileAccountEmail, { color: profileMutedText }]}>{profileEmail}</Text>
                      </View>
                    </View>
                  </View>

                  {!isPasswordSectionOpen && isHrManager ? (
                    <TouchableOpacity
                      style={[
                        styles.profileNotificationsCard,
                        {
                          backgroundColor: profileSurface,
                          borderColor: profileBorder,
                        },
                      ]}
                      onPress={() => {
                        setAuthNotice(
                          profileNotificationsCount > 0
                            ? `Новых уведомлений по открытиям смен: ${profileNotificationsCount}`
                            : 'Пока новых уведомлений по открытиям смен нет',
                        );
                      }}>
                      <View style={styles.profileNotificationsTextBlock}>
                        <Text style={[styles.profileNotificationsTitle, { color: profileText }]}>Уведомления</Text>
                        <Text style={[styles.profileNotificationsSubtitle, { color: profileMutedText }]}>
                          Открытия смен для HR-менеджеров
                        </Text>
                      </View>
                      <View style={styles.profileNotificationsMetaBlock}>
                        {isProfileNotificationsLoading ? (
                          <ActivityIndicator size="small" color="#FF6A00" />
                        ) : profileNotificationsCount > 0 ? (
                          <View style={[styles.profileNotificationCountBadge, { backgroundColor: profileAccent }]}>
                            <Text style={styles.profileNotificationCountBadgeText}>
                              {profileNotificationsCount > 99 ? '99+' : profileNotificationsCount}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.profileRowMutedMeta, { color: profileAccent }]}>Нет новых</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {!isPasswordSectionOpen ? (
                    <View
                      style={[
                        styles.profileActionsCard,
                        {
                          backgroundColor: profileSurface,
                          borderColor: profileBorder,
                        },
                      ]}>
                      <TouchableOpacity
                        style={styles.profileRowButton}
                        onPress={() => {
                          setIsPasswordSectionOpen(true);
                          setChangePasswordError(null);
                          setChangePasswordSuccess(null);
                        }}
                        disabled={isChangingPassword}>
                        <Text style={[styles.profileRowButtonText, { color: profileText }]}>Смена пароля</Text>
                        <Text style={[styles.profileRowChevron, { color: profileAccent }]}>›</Text>
                      </TouchableOpacity>

                      <View style={[styles.profileDivider, { backgroundColor: profileBorder }]} />
                      <View style={styles.profileRowStatic}>
                        <Text style={[styles.profileRowMutedText, { color: profileMutedText }]}>
                          {isHrManager
                            ? 'Лента уведомлений появится здесь следующим шагом'
                            : 'Тут скоро что-то будет'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.profilePasswordCard,
                        {
                          backgroundColor: profileSurface,
                          borderColor: profileBorder,
                        },
                      ]}>
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

                  <View
                    style={[
                      styles.profileBottomBlock,
                      {
                        backgroundColor: profileSurface,
                        borderColor: profileBorder,
                      },
                    ]}>
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
              isAndroid && androidPalette ? androidPalette.primary : undefined
            }
            activeBackgroundColor={androidTabActiveBackground}
            activePillSolidColor={androidTabActivePillSolid}
            activeForegroundColor={androidTabActiveForeground}
            inactiveTintColor={androidTabInactiveForeground}
            shellBackgroundColor={androidTabShellBackground}
            shellBorderColor={androidTabShellBorder}
            mailIcon={mailIcon}
            trashIcon={trashIcon}
            trashLabel="Товары"
          />
        </View>
      </Animated.View>
    );
  }

  const authScreenAnimatedStyle = isAndroid
    ? {
        opacity: authScreenReveal,
        transform: [
          {
            translateY: authScreenReveal.interpolate({
              inputRange: [0, 1],
              outputRange: [28, 0],
              extrapolate: 'clamp',
            }),
          },
          {
            scale: authScreenReveal.interpolate({
              inputRange: [0, 1],
              outputRange: [0.986, 1],
              extrapolate: 'clamp',
            }),
          },
        ],
      }
    : undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: authBackground }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={authStatusBarStyle} backgroundColor={authBackgroundHex} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Animated.View
        style={[
          styles.authContent,
          {
            backgroundColor: authBackground,
            justifyContent: isAndroid && isAuthKeyboardVisible ? 'flex-start' : 'center',
            paddingTop:
              isAndroid && isAuthKeyboardVisible ? Math.max(insets.top + 72, 92) : 0,
          },
          authScreenAnimatedStyle,
        ]}>
      <Animated.View
        style={[
          styles.formCard,
          {
            transform: [{ translateY: authKeyboardShift }],
          },
        ]}>
        {isForgotPasswordFlow ? (
          <>
            <Text style={[styles.sectionTitle, { color: authText }]}>Восстановление пароля</Text>
            {!isCodeSent ? (
              <Pressable
                style={[
                  styles.phoneInputWrap,
                  {
                    backgroundColor: authSurfaceMuted,
                    borderColor: authBorder,
                  },
                  focusedForgotField === 'identity' && authInputFocusedStyle,
                ]}
                onPress={() => forgotPhoneInputRef.current?.focus()}>
                <Text style={[styles.phonePrefix, { color: authPlaceholder }]} pointerEvents="none">+7</Text>
                <TextInput
                  ref={forgotPhoneInputRef}
                  style={[styles.phoneInputControl, { color: authText }]}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={formatLocalPhoneDisplay(forgotIdentity)}
                  maxLength={13}
                  selection={forgotPhoneSelection}
                  onFocus={() => {
                    setFocusedForgotField('identity');
                    const caret = formatLocalPhoneDisplay(forgotIdentity).length;
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
                    const nextDisplay = formatLocalPhoneInputWithBackspace(
                      formatLocalPhoneDisplay(forgotIdentity),
                      text,
                    );
                    const nextIdentifier = formatPhoneInput(`+7${nextDisplay}`);
                    setForgotIdentity(nextIdentifier);
                    const caret = nextDisplay.length;
                    setForgotPhoneSelection({ start: caret, end: caret });
                    if (forgotError) {
                      setForgotError(null);
                    }
                  }}
                  editable={!isForgotSubmitting}
                />
              </Pressable>
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
                style={[
                  styles.button,
                  {
                    backgroundColor: authButtonBackground,
                    borderColor: authButtonBorder,
                    shadowColor: authAccent,
                    shadowOpacity: authIsMaterial ? 0.16 : 0.4,
                    shadowRadius: authIsMaterial ? 12 : 8,
                    elevation: authIsMaterial ? 3 : 6,
                  },
                  isForgotSubmitting && styles.buttonDisabled,
                ]}
                onPress={() => {
                  androidMediumImpact();
                  sendResetCode();
                }}
                disabled={isForgotSubmitting}
              >
                {isForgotSubmitting ? (
                  <ActivityIndicator color={authOnAccent} />
                ) : (
                  <Text style={[styles.buttonText, { color: authOnAccent }]}>Получить код</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {isCodeSent ? (
              <>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: authSurfaceMuted,
                      borderColor: authBorder,
                      color: authText,
                    },
                    focusedForgotField === 'code' && authInputFocusedStyle,
                  ]}
                  placeholder="Код из почты"
                  placeholderTextColor={authPlaceholder}
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
                      {
                        backgroundColor: authSurfaceMuted,
                        borderColor: authBorder,
                        color: authText,
                      },
                      focusedForgotField === 'newPassword' && authInputFocusedStyle,
                    ]}
                    placeholder="Новый пароль"
                    placeholderTextColor={authPlaceholder}
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
                      style={[styles.eyeImage, { tintColor: authText }]}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: authAccent, shadowColor: authAccent },
                    isForgotSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    androidSuccessHaptic();
                    submitResetPassword();
                  }}
                  disabled={isForgotSubmitting}
                >
                  {isForgotSubmitting ? (
                    <ActivityIndicator color={authOnAccent} />
                  ) : (
                    <Text style={[styles.buttonText, { color: authOnAccent }]}>Сбросить пароль</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={resetForgotPasswordForm}
              disabled={isForgotSubmitting}
            >
              <Text style={[styles.linkButtonText, { color: authAccent }]}>Назад</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
        <AnimatedEntranceView delay={30} style={styles.brandBlock}>
          <View
            style={[
              styles.brandMarkRow,
              {
                backgroundColor: authBrandCapsuleBackground,
                borderColor: authBrandCapsuleBorder,
              },
            ]}>
            <View style={[styles.brandMarkGlow, { backgroundColor: authBrandGlow }]} />
            <View style={[styles.brandMarkDot, { backgroundColor: authAccent }]} />
            <View style={[styles.brandMark, { backgroundColor: authAccent }]} />
          </View>
          <Text style={[styles.brandEyebrow, { color: authMutedText }]}>платформа компании</Text>
          <Text style={[styles.brandTitle, { color: authText }]}>Dr. Smoke</Text>
          <Text style={[styles.brandSubtitle, { color: authMutedText }]}>
            Авторизация
          </Text>
        </AnimatedEntranceView>
        <AnimatedEntranceView delay={90}>
        <Pressable
          style={[
            styles.phoneInputWrap,
            {
              backgroundColor: authSurfaceMuted,
              borderColor: authBorder,
            },
            focusedLoginField === 'identifier' && authInputFocusedStyle,
          ]}
          onPress={() => loginPhoneInputRef.current?.focus()}>
          <Text style={[styles.phonePrefix, { color: authPlaceholder }]} pointerEvents="none">+7</Text>
          <TextInput
            ref={loginPhoneInputRef}
            style={[styles.phoneInputControl, { color: authText }]}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            inputAccessoryViewID={Platform.OS === 'ios' ? authAccessoryId : undefined}
            returnKeyType="next"
            value={formatLocalPhoneDisplay(form.identifier)}
            maxLength={13}
            selection={loginPhoneSelection}
            onChangeText={text => {
              const nextDisplay = formatLocalPhoneInputWithBackspace(
                formatLocalPhoneDisplay(form.identifier),
                text,
              );
              updateField('identifier', formatPhoneInput(`+7${nextDisplay}`));
              const caret = nextDisplay.length;
              setLoginPhoneSelection({ start: caret, end: caret });
              if (authNotice) {
                setAuthNotice(null);
              }
            }}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            onFocus={() => {
              setFocusedLoginField('identifier');
              const caret = formatLocalPhoneDisplay(form.identifier).length;
              setLoginPhoneSelection({ start: caret, end: caret });
            }}
            onBlur={() => setFocusedLoginField(null)}
            editable={!isSubmitting}
          />
        </Pressable>

        <View style={styles.passwordField}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: authSurfaceMuted,
                borderColor: authBorder,
                color: authText,
              },
              focusedLoginField === 'password' && authInputFocusedStyle,
            ]}
            placeholder="Пароль"
            placeholderTextColor={authPlaceholder}
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
              style={[styles.eyeImage, { tintColor: authText }]}
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
          style={[
            styles.button,
            {
              backgroundColor: authButtonBackground,
              borderColor: authButtonBorder,
              shadowColor: authAccent,
              shadowOpacity: authIsMaterial ? 0.16 : 0.4,
              shadowRadius: authIsMaterial ? 12 : 8,
              elevation: authIsMaterial ? 3 : 6,
            },
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={() => {
            androidMediumImpact();
            submit();
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={authOnAccent} />
          ) : (
            <Text style={[styles.buttonText, { color: authOnAccent }]}>Войти</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            androidLightImpact();
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
          <Text style={[styles.linkButtonText, { color: authAccent }]}>Забыли пароль?</Text>
        </TouchableOpacity>
        </AnimatedEntranceView>
          </>
        )}
      </Animated.View>
      </Animated.View>
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
