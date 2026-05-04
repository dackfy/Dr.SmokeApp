import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  InputAccessoryView,
  Pressable,
  StyleSheet,
  Dimensions,
  useColorScheme,
  PlatformColor,
  type ImageSourcePropType,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AnimatedReanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AnimatedEntranceView from '../components/AnimatedEntranceView';
import { styles } from './AuthScreen.styles';
import { useAuth } from '../features/auth/useAuth';
import MoreScreen from './MoreScreen';
import CertificatesScreen from './CertificatesScreen';
import TasksScreen from './TasksScreen';
import HomeScreenRouter from './HomeScreenRouter';
import ProductInfoScreen from './ProductInfoScreen';
import { authApi } from '../features/auth/authApi';
import { buildApiUrl } from '../config/api';
import {
  formatNotificationTimestamp,
  notificationsApi,
  type NotificationItem,
} from '../features/notifications/notificationsApi';
import { emitNotificationsUnreadCountChanged } from '../features/notifications/notificationsEvents';
import LiquidTabBar from '../components/LiquidTabBar';
import type { TabKey } from '../components/LiquidTabBar';
import {
  getInitialPushNotification,
  subscribeToForegroundPushMessages,
  subscribeToPushNotificationOpens,
} from '../features/push/pushApi';
import { trigger as triggerHaptic } from 'react-native-haptic-feedback';
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

const eyeOpenIcon: ImageSourcePropType = require('../assets/icons/eye-open.png');
const eyeClosedIcon: ImageSourcePropType = require('../assets/icons/eye-closed.png');
const homeIcon: ImageSourcePropType = require('../assets/icons/home.png');
const profileIcon: ImageSourcePropType = require('../assets/icons/more.png');
const mailIcon: ImageSourcePropType = require('../assets/icons/clip.png');
const trashIcon: ImageSourcePropType = require('../assets/icons/shop.png');
const deleteIcon: ImageSourcePropType = require('../assets/icons/delete.png');
const crossIcon: ImageSourcePropType = require('../assets/icons/cross.png');
const lockIcon: ImageSourcePropType = require('../assets/icons/lock.png');

type AuthTab = TabKey;
type ProfileScreenRoute =
  | 'root'
  | 'appearance'
  | 'portal'
  | 'notifications'
  | 'household-order';
type ProfileSheetRoute = 'root' | 'notifications' | 'notification-detail';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PROFILE_SHEET_DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.42;
const PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH = 74;
const PROFILE_NOTIFICATION_IMAGE_MAX_SCALE = 3;
const PROFILE_NOTIFICATION_IMAGE_CLOSE_DISTANCE = SCREEN_HEIGHT * 0.14;
const PROFILE_NOTIFICATION_IMAGE_CLOSE_VELOCITY = 1150;
const MESSAGE_VISIBLE_MS = 2550;
const MESSAGE_FADE_MS = 450;
const MESSAGE_FADE_IN_MS = 120;

function clampValue(value: number, min: number, max: number) {
  'worklet';

  return Math.min(Math.max(value, min), max);
}

function getImagePanBound(length: number, scale: number) {
  'worklet';

  return Math.max(0, (length * scale - length) / 2);
}

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
  const local = (
    digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits
  ).slice(0, 10);

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

function formatLocalPhoneInputWithBackspace(
  prevValue: string,
  nextValue: string,
) {
  const prevLocal = extractLocalPhoneDigits(prevValue);
  const nextLocal = extractLocalPhoneDigits(nextValue);

  if (nextLocal.length > 10) {
    return formatLocalPhoneDisplay(prevLocal);
  }

  if (
    nextValue.length < prevValue.length &&
    nextLocal.length === prevLocal.length
  ) {
    return formatLocalPhoneDisplay(prevLocal.slice(0, -1));
  }

  return formatLocalPhoneDisplay(nextLocal);
}

function extractLocalPhoneDigits(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return (
    digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits
  ).slice(0, 10);
}

function formatPhoneInputWithBackspace(prevValue: string, nextValue: string) {
  const prevLocal = extractLocalPhoneDigits(prevValue);
  const nextLocal = extractLocalPhoneDigits(nextValue);

  // If user deleted only mask symbols ( ) - and local digits count did not change,
  // treat it as deleting one digit to avoid "stuck" backspace behavior.
  if (
    nextValue.length < prevValue.length &&
    nextLocal.length === prevLocal.length
  ) {
    return formatPhoneInput(`+7${prevLocal.slice(0, -1)}`);
  }

  return formatPhoneInput(nextValue);
}

function getNotificationPayloadImageUrl(
  payload: Record<string, unknown> | null,
  key: 'photo_opening_check' | 'photo_opening_em',
) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getNotificationPayloadString(
  payload: Record<string, unknown> | null,
  key: string,
) {
  const value = payload?.[key];

  if (value === undefined || value === null) {
    return null;
  }

  const textValue = String(value).trim();
  return textValue || null;
}

function getComparableNumericString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const textValue = String(value).trim();
  if (!textValue) {
    return null;
  }

  const numericValue = Number(textValue);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return String(numericValue);
}

function getPushDataString(
  message: FirebaseMessagingTypes.RemoteMessage,
  key: string,
) {
  const value = message.data?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getPushNotificationOpenMessageKey(
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  const notificationId = getPushDataString(message, 'notification_id');
  if (notificationId) {
    return `notification:${notificationId}`;
  }

  const fragments = [
    message.messageId || '',
    getPushDataString(message, 'type') || '',
    getPushDataString(message, 'event') || '',
    getPushDataString(message, 'employee_id') || '',
    getPushDataString(message, 'shop_id') || '',
    getPushDataString(message, 'region_id') || '',
    getPushDataString(message, 'report_date') || '',
    getPushDataString(message, 'open_time') || '',
    String(message.notification?.title || '').trim(),
    String(message.notification?.body || '').trim(),
  ].filter(Boolean);

  if (fragments.length === 0) {
    return null;
  }

  return fragments.join('|');
}

function findNotificationFromPushMessage(
  notifications: NotificationItem[],
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  const pushNotificationId = getComparableNumericString(
    getPushDataString(message, 'notification_id'),
  );

  if (pushNotificationId) {
    const exactNotification = notifications.find(
      notification => String(notification.id) === pushNotificationId,
    );

    if (exactNotification) {
      return exactNotification;
    }
  }

  const pushType =
    getPushDataString(message, 'type') || getPushDataString(message, 'event');
  const pushEmployeeId = getComparableNumericString(
    getPushDataString(message, 'employee_id'),
  );
  const pushShopId = getComparableNumericString(
    getPushDataString(message, 'shop_id'),
  );
  const pushRegionId = getComparableNumericString(
    getPushDataString(message, 'region_id'),
  );
  const pushReportDate = getPushDataString(message, 'report_date');
  const pushOpenTime = getPushDataString(message, 'open_time');

  const payloadMatchedNotification = notifications.find(notification => {
    const payload = notification.payload;
    const notificationType =
      String(notification.type || '').trim() ||
      getNotificationPayloadString(payload, 'event');
    const notificationEmployeeId = getComparableNumericString(
      getNotificationPayloadString(payload, 'employee_id'),
    );
    const notificationShopId = getComparableNumericString(
      getNotificationPayloadString(payload, 'shop_id'),
    );
    const notificationRegionId = getComparableNumericString(
      getNotificationPayloadString(payload, 'region_id'),
    );
    const notificationReportDate = getNotificationPayloadString(
      payload,
      'report_date',
    );
    const notificationOpenTime = getNotificationPayloadString(
      payload,
      'open_time',
    );

    const comparablePairs: Array<[string | null, string | null]> = [
      [pushType, notificationType || null],
      [pushEmployeeId, notificationEmployeeId],
      [pushShopId, notificationShopId],
      [pushRegionId, notificationRegionId],
      [pushReportDate, notificationReportDate],
      [pushOpenTime, notificationOpenTime],
    ];

    const usablePairs = comparablePairs.filter(
      ([pushValue, notificationValue]) => {
        return Boolean(pushValue && notificationValue);
      },
    );

    if (usablePairs.length === 0) {
      return false;
    }

    return usablePairs.every(([pushValue, notificationValue]) => {
      return pushValue === notificationValue;
    });
  });

  if (payloadMatchedNotification) {
    return payloadMatchedNotification;
  }

  const pushTitle = String(message.notification?.title || '').trim();
  const pushBody = String(message.notification?.body || '').trim();

  if (!pushTitle && !pushBody) {
    return null;
  }

  return (
    notifications.find(notification => {
      const notificationTitle = String(notification.title || '').trim();
      const notificationBody = String(notification.body || '').trim();

      if (pushTitle && notificationTitle !== pushTitle) {
        return false;
      }

      if (pushBody && notificationBody !== pushBody) {
        return false;
      }

      return true;
    }) || null
  );
}

type ProfileNotificationRowProps = {
  notification: NotificationItem;
  isBusy: boolean;
  onPress: (notification: NotificationItem) => void;
  onDelete: (notification: NotificationItem) => void;
  onRegisterSwipeable: (notificationId: number, instance: any | null) => void;
  onSwipeOpenStart: (notificationId: number) => void;
  onSwipeCloseStart: (notificationId: number) => void;
  onSwipeOpened: (notificationId: number) => void;
  onSwipeClosed: (notificationId: number) => void;
  onSwipeActiveChange: (isActive: boolean) => void;
};

type ProfileNotificationDeleteActionProps = {
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  isBusy: boolean;
  onPress: () => void;
};

function ProfileNotificationDeleteAction({
  progress,
  translation,
  isBusy,
  onPress,
}: ProfileNotificationDeleteActionProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const pullDistance = Math.abs(translation.value);
    const reveal = interpolate(
      progress.value,
      [0, 0.18, 0.72, 1],
      [0, 0.18, 0.82, 1],
      Extrapolation.CLAMP,
    );
    const translateX = interpolate(
      pullDistance,
      [
        0,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH * 0.35,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH * 1.32,
      ],
      [24, 12, 0, -8],
      Extrapolation.CLAMP,
    );
    const scaleX = interpolate(
      pullDistance,
      [
        0,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH * 0.5,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH * 1.32,
      ],
      [0.78, 0.9, 1, 1.08],
      Extrapolation.CLAMP,
    );
    const scaleY = interpolate(
      pullDistance,
      [
        0,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH * 0.5,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH,
        PROFILE_NOTIFICATION_DELETE_ACTION_WIDTH * 1.32,
      ],
      [0.84, 0.94, 1, 1.05],
      Extrapolation.CLAMP,
    );

    return {
      opacity: reveal,
      transform: [{ translateX }, { scaleX }, { scaleY }],
    };
  }, []);

  return (
    <View style={styles.profileNotificationRightActions}>
      <AnimatedReanimated.View
        style={[styles.profileNotificationDeleteActionWrap, animatedStyle]}
      >
        <TouchableOpacity
          style={styles.profileNotificationDeleteAction}
          onPress={onPress}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Удалить уведомление"
        >
          <Image
            source={deleteIcon}
            style={styles.profileNotificationDeleteIcon}
          />
        </TouchableOpacity>
      </AnimatedReanimated.View>
    </View>
  );
}

function ProfileNotificationRow({
  notification,
  isBusy,
  onPress,
  onDelete,
  onRegisterSwipeable,
  onSwipeOpenStart,
  onSwipeCloseStart,
  onSwipeOpened,
  onSwipeClosed,
  onSwipeActiveChange,
}: ProfileNotificationRowProps) {
  const isUnread = !notification.is_read;
  const swipeableRef = React.useRef<any>(null);

  React.useEffect(() => {
    onRegisterSwipeable(notification.id, swipeableRef.current);

    return () => {
      onRegisterSwipeable(notification.id, null);
    };
  }, [notification.id, onRegisterSwipeable]);

  const handleDeletePress = React.useCallback(() => {
    if (isBusy) {
      return;
    }

    swipeableRef.current?.close();
    onDelete(notification);
  }, [isBusy, notification, onDelete]);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={1.85}
      rightThreshold={32}
      overshootRight
      overshootFriction={5.5}
      animationOptions={{
        mass: 0.9,
        damping: 18,
        stiffness: 205,
        overshootClamping: false,
        restDisplacementThreshold: 0.15,
        restSpeedThreshold: 0.15,
      }}
      enableTrackpadTwoFingerGesture
      containerStyle={styles.profileNotificationSwipeContainer}
      onSwipeableOpenStartDrag={() => {
        onSwipeOpenStart(notification.id);
        onSwipeActiveChange(true);
      }}
      onSwipeableCloseStartDrag={() => {
        onSwipeCloseStart(notification.id);
        onSwipeActiveChange(true);
      }}
      onSwipeableOpen={() => {
        onSwipeActiveChange(false);
        onSwipeOpened(notification.id);
      }}
      onSwipeableClose={() => {
        onSwipeActiveChange(false);
        onSwipeClosed(notification.id);
      }}
      renderRightActions={(progress, translation) => (
        <ProfileNotificationDeleteAction
          progress={progress}
          translation={translation}
          isBusy={isBusy}
          onPress={handleDeletePress}
        />
      )}
    >
      <View style={styles.profileNotificationSwipeWrap}>
        <View style={styles.profileNotificationSwipeCard}>
          <TouchableOpacity
            style={[
              styles.profileNotificationItem,
              !isUnread && styles.profileNotificationItemRead,
            ]}
            onPress={() => onPress(notification)}
            disabled={isBusy}
            activeOpacity={0.92}
          >
            {isUnread ? (
              <View style={styles.profileNotificationUnreadStripe} />
            ) : null}
            <View style={styles.profileNotificationItemHeader}>
              <Text style={styles.profileNotificationItemMeta}>
                {formatNotificationTimestamp(notification)}
              </Text>
              {isBusy ? (
                <ActivityIndicator size="small" color="#FF6A00" />
              ) : null}
            </View>
            <Text style={styles.profileNotificationItemTitle}>
              {notification.title || 'Уведомление'}
            </Text>
            <Text style={styles.profileNotificationItemBody}>
              {notification.body || 'Текст уведомления не указан'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const androidTheme = useAndroidThemeMode();
  const isAndroid = Platform.OS === 'android';
  const androidPalette = isAndroid
    ? androidTheme.mode === 'company'
      ? getAndroidCompanyPalette()
      : getAndroidThemePalette(
          colorScheme === 'dark',
          androidTheme.contrastMode,
        )
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
  const [loginPhoneSelection, setLoginPhoneSelection] = useState({
    start: 0,
    end: 0,
  });
  const [focusedForgotField, setFocusedForgotField] = useState<
    'identity' | 'code' | 'newPassword' | null
  >(null);
  const [forgotPhoneSelection, setForgotPhoneSelection] = useState({
    start: 0,
    end: 0,
  });
  const [activeTab, setActiveTab] = useState<AuthTab>('home');
  const [isCertificatesModalVisible, setIsCertificatesModalVisible] = useState(false);
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
  const [profileInitialRoute, setProfileInitialRoute] =
    useState<ProfileScreenRoute>('root');
  const [profileNotificationsCount, setProfileNotificationsCount] = useState(0);
  const [isProfileNotificationsLoading, setIsProfileNotificationsLoading] =
    useState(false);
  const [
    isRefreshingProfileNotifications,
    setIsRefreshingProfileNotifications,
  ] = useState(false);
  const [isProfileNotificationsPulling, setIsProfileNotificationsPulling] =
    useState(false);
  const [
    profileNotificationsPullDistance,
    setProfileNotificationsPullDistance,
  ] = useState(0);
  const [profileSheetRoute, setProfileSheetRoute] =
    useState<ProfileSheetRoute>('root');
  const [profileNotifications, setProfileNotifications] = useState<
    NotificationItem[]
  >([]);
  const [selectedProfileNotification, setSelectedProfileNotification] =
    useState<NotificationItem | null>(null);
  const [
    selectedProfileNotificationImage,
    setSelectedProfileNotificationImage,
  ] = useState<string | null>(null);
  const [
    selectedProfileNotificationImageSize,
    setSelectedProfileNotificationImageSize,
  ] = useState<{ width: number; height: number } | null>(null);
  const [
    isProfileNotificationImageLoading,
    setIsProfileNotificationImageLoading,
  ] = useState(false);
  const [
    isProfileNotificationImageChromeVisible,
    setIsProfileNotificationImageChromeVisible,
  ] = useState(true);
  const [activeProfileNotificationId, setActiveProfileNotificationId] =
    useState<number | null>(null);
  const [deletingProfileNotificationId, setDeletingProfileNotificationId] =
    useState<number | null>(null);
  const [
    isProfileNotificationSwipeActive,
    setIsProfileNotificationSwipeActive,
  ] = useState(false);
  const [
    isMarkingAllProfileNotificationsRead,
    setIsMarkingAllProfileNotificationsRead,
  ] = useState(false);
  const profileSheetProgress = useRef(new Animated.Value(0)).current;
  const profileSheetDragY = useRef(new Animated.Value(0)).current;
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
  const profileNotificationSwipeablesRef = useRef(new Map<number, any>());
  const openedProfileNotificationIdRef = useRef<number | null>(null);
  const handledPushOpenMessageIdsRef = useRef(new Map<string, number>());
  const hasCheckedInitialPushOpenRef = useRef(false);
  const isProfileNotificationImageViewerOpen = Boolean(
    selectedProfileNotificationImage,
  );
  const profileNotificationImageScale = useSharedValue(1);
  const profileNotificationImageScaleOffset = useSharedValue(1);
  const profileNotificationImageTranslateX = useSharedValue(0);
  const profileNotificationImageTranslateY = useSharedValue(0);
  const profileNotificationImageGestureMode = useSharedValue<0 | 1 | 2>(0);
  const profileNotificationImagePanStartX = useSharedValue(0);
  const profileNotificationImagePanStartY = useSharedValue(0);
  const profileNotificationImageBaseWidth = useSharedValue(SCREEN_WIDTH);
  const profileNotificationImageBaseHeight = useSharedValue(SCREEN_HEIGHT);
  const profileNotificationImageFrame = React.useMemo(() => {
    const imageWidth =
      selectedProfileNotificationImageSize?.width ?? SCREEN_WIDTH;
    const imageHeight =
      selectedProfileNotificationImageSize?.height ?? SCREEN_HEIGHT;

    if (imageWidth <= 0 || imageHeight <= 0) {
      return { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
    }

    const imageAspectRatio = imageWidth / imageHeight;
    let frameWidth = SCREEN_WIDTH;
    let frameHeight = frameWidth / imageAspectRatio;

    if (frameHeight > SCREEN_HEIGHT) {
      frameHeight = SCREEN_HEIGHT;
      frameWidth = frameHeight * imageAspectRatio;
    }

    return { width: frameWidth, height: frameHeight };
  }, [selectedProfileNotificationImageSize]);
  const profileNotificationsSwipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (profileSheetRoute !== 'notifications') {
            return false;
          }

          const isHorizontalSwipe =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
          return gestureState.dx > 16 && isHorizontalSwipe;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (
            profileSheetRoute === 'notifications' &&
            gestureState.dx > 72 &&
            Math.abs(gestureState.dy) < 48
          ) {
            setProfileSheetRoute('root');
          }
        },
      }),
    [profileSheetRoute],
  );

  const profileNotificationDetailSwipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, gestureState) => {
          if (profileSheetRoute !== 'notification-detail') {
            return false;
          }

          const isHorizontalSwipe =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
          return (
            event.nativeEvent.pageX < 36 &&
            gestureState.dx > 14 &&
            isHorizontalSwipe
          );
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (
            profileSheetRoute === 'notification-detail' &&
            gestureState.dx > 72 &&
            Math.abs(gestureState.dy) < 48
          ) {
            setProfileSheetRoute('notifications');
          }
        },
      }),
    [profileSheetRoute],
  );

  useEffect(() => {
    profileNotificationImageBaseWidth.value =
      profileNotificationImageFrame.width;
    profileNotificationImageBaseHeight.value =
      profileNotificationImageFrame.height;
  }, [
    profileNotificationImageBaseHeight,
    profileNotificationImageBaseWidth,
    profileNotificationImageFrame.height,
    profileNotificationImageFrame.width,
  ]);

  const resetProfileNotificationImageViewerTransform = React.useCallback(() => {
    profileNotificationImageScale.value = 1;
    profileNotificationImageScaleOffset.value = 1;
    profileNotificationImageTranslateX.value = 0;
    profileNotificationImageTranslateY.value = 0;
    profileNotificationImageGestureMode.value = 0;
    profileNotificationImagePanStartX.value = 0;
    profileNotificationImagePanStartY.value = 0;
  }, [
    profileNotificationImageGestureMode,
    profileNotificationImagePanStartX,
    profileNotificationImagePanStartY,
    profileNotificationImageScale,
    profileNotificationImageScaleOffset,
    profileNotificationImageTranslateX,
    profileNotificationImageTranslateY,
  ]);

  const toggleProfileNotificationImageChrome = React.useCallback(() => {
    setIsProfileNotificationImageChromeVisible(current => !current);
  }, []);

  const openProfileNotificationImageViewer = React.useCallback(
    (imageUrl: string) => {
      resetProfileNotificationImageViewerTransform();
      setSelectedProfileNotificationImageSize(null);
      setIsProfileNotificationImageChromeVisible(true);
      setIsProfileNotificationImageLoading(true);
      setSelectedProfileNotificationImage(imageUrl);
    },
    [resetProfileNotificationImageViewerTransform],
  );

  const closeProfileNotificationImageViewer = React.useCallback(() => {
    setSelectedProfileNotificationImage(null);
    setIsProfileNotificationImageLoading(false);
    setIsProfileNotificationImageChromeVisible(true);
    requestAnimationFrame(() => {
      resetProfileNotificationImageViewerTransform();
    });
  }, [resetProfileNotificationImageViewerTransform]);

  const resetProfileNotificationImageViewerPosition = React.useCallback(() => {
    profileNotificationImageTranslateX.value = withSpring(0, {
      damping: 24,
      stiffness: 240,
      mass: 0.9,
    });
    profileNotificationImageTranslateY.value = withSpring(0, {
      damping: 24,
      stiffness: 240,
      mass: 0.9,
    });
  }, [profileNotificationImageTranslateX, profileNotificationImageTranslateY]);

  const dismissProfileNotificationImageViewerFromDrag =
    React.useCallback(() => {
      profileNotificationImageTranslateX.value = withTiming(0, {
        duration: 180,
      });
      profileNotificationImageTranslateY.value = withTiming(
        SCREEN_HEIGHT,
        {
          duration: 200,
        },
        finished => {
          if (finished) {
            runOnJS(closeProfileNotificationImageViewer)();
          }
        },
      );
    }, [
      closeProfileNotificationImageViewer,
      profileNotificationImageTranslateX,
      profileNotificationImageTranslateY,
    ]);

  const profileNotificationImageViewerBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: 1,
    };
  }, []);

  const profileNotificationImageViewerTopBarStyle = useAnimatedStyle(() => {
    const dismissDistance =
      profileNotificationImageScale.value <= 1.02 ||
      profileNotificationImageGestureMode.value === 2
        ? Math.abs(profileNotificationImageTranslateY.value)
        : 0;

    return {
      opacity: 1 - Math.min(dismissDistance / 160, 0.78),
    };
  }, []);

  const profileNotificationImageViewerSurfaceStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: profileNotificationImageTranslateX.value },
        { translateY: profileNotificationImageTranslateY.value },
        { scale: profileNotificationImageScale.value },
      ],
    };
  }, [
    profileNotificationImageScale,
    profileNotificationImageTranslateX,
    profileNotificationImageTranslateY,
  ]);

  const profileNotificationImageTapGesture = React.useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .maxDistance(10)
        .onEnd((_event, success) => {
          if (success) {
            runOnJS(toggleProfileNotificationImageChrome)();
          }
        }),
    [toggleProfileNotificationImageChrome],
  );

  const profileNotificationImagePinchGesture = React.useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          profileNotificationImageScaleOffset.value =
            profileNotificationImageScale.value;
        })
        .onUpdate(event => {
          const nextScale = clampValue(
            profileNotificationImageScaleOffset.value * event.scale,
            1,
            PROFILE_NOTIFICATION_IMAGE_MAX_SCALE,
          );

          profileNotificationImageScale.value = nextScale;

          if (nextScale <= 1.02) {
            profileNotificationImageTranslateX.value = 0;
            profileNotificationImageTranslateY.value = 0;
            return;
          }

          const maxTranslateX = getImagePanBound(
            profileNotificationImageBaseWidth.value,
            nextScale,
          );
          const maxTranslateY = getImagePanBound(
            profileNotificationImageBaseHeight.value,
            nextScale,
          );

          profileNotificationImageTranslateX.value = clampValue(
            profileNotificationImageTranslateX.value,
            -maxTranslateX,
            maxTranslateX,
          );
          profileNotificationImageTranslateY.value = clampValue(
            profileNotificationImageTranslateY.value,
            -maxTranslateY,
            maxTranslateY,
          );
        })
        .onEnd(() => {
          const nextScale = clampValue(
            profileNotificationImageScale.value,
            1,
            PROFILE_NOTIFICATION_IMAGE_MAX_SCALE,
          );

          if (nextScale <= 1.02) {
            profileNotificationImageScale.value = withSpring(1, {
              damping: 24,
              stiffness: 220,
              mass: 0.9,
            });
            profileNotificationImageTranslateX.value = withSpring(0, {
              damping: 24,
              stiffness: 220,
              mass: 0.9,
            });
            profileNotificationImageTranslateY.value = withSpring(0, {
              damping: 24,
              stiffness: 220,
              mass: 0.9,
            });
            return;
          }

          const maxTranslateX = getImagePanBound(
            profileNotificationImageBaseWidth.value,
            nextScale,
          );
          const maxTranslateY = getImagePanBound(
            profileNotificationImageBaseHeight.value,
            nextScale,
          );

          profileNotificationImageScale.value = withSpring(nextScale, {
            damping: 24,
            stiffness: 220,
            mass: 0.9,
          });
          profileNotificationImageTranslateX.value = withSpring(
            clampValue(
              profileNotificationImageTranslateX.value,
              -maxTranslateX,
              maxTranslateX,
            ),
            {
              damping: 24,
              stiffness: 220,
              mass: 0.9,
            },
          );
          profileNotificationImageTranslateY.value = withSpring(
            clampValue(
              profileNotificationImageTranslateY.value,
              -maxTranslateY,
              maxTranslateY,
            ),
            {
              damping: 24,
              stiffness: 220,
              mass: 0.9,
            },
          );
        }),
    [
      profileNotificationImageBaseHeight,
      profileNotificationImageBaseWidth,
      profileNotificationImageScale,
      profileNotificationImageScaleOffset,
      profileNotificationImageTranslateX,
      profileNotificationImageTranslateY,
    ],
  );

  const profileNotificationImagePanGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onStart(() => {
          profileNotificationImagePanStartX.value =
            profileNotificationImageTranslateX.value;
          profileNotificationImagePanStartY.value =
            profileNotificationImageTranslateY.value;
          profileNotificationImageGestureMode.value = 0;
        })
        .onUpdate(event => {
          if (profileNotificationImageScale.value > 1.02) {
            if (profileNotificationImageGestureMode.value === 0) {
              const absX = Math.abs(event.translationX);
              const absY = Math.abs(event.translationY);
              const isDismissIntent =
                event.translationY > 8 && absY > absX * 1.1;

              if (isDismissIntent) {
                profileNotificationImageGestureMode.value = 2;
              } else if (absX > 6 || absY > 6) {
                profileNotificationImageGestureMode.value = 1;
              }
            }

            if (profileNotificationImageGestureMode.value === 2) {
              profileNotificationImageTranslateX.value =
                event.translationX * 0.08;
              profileNotificationImageTranslateY.value = Math.max(
                event.translationY,
                0,
              );
              return;
            }

            const maxTranslateX = getImagePanBound(
              profileNotificationImageBaseWidth.value,
              profileNotificationImageScale.value,
            );
            const maxTranslateY = getImagePanBound(
              profileNotificationImageBaseHeight.value,
              profileNotificationImageScale.value,
            );

            profileNotificationImageTranslateX.value = clampValue(
              profileNotificationImagePanStartX.value + event.translationX,
              -maxTranslateX,
              maxTranslateX,
            );
            profileNotificationImageTranslateY.value = clampValue(
              profileNotificationImagePanStartY.value + event.translationY,
              -maxTranslateY,
              maxTranslateY,
            );
            return;
          }

          profileNotificationImageTranslateX.value = event.translationX * 0.16;
          profileNotificationImageTranslateY.value = Math.max(
            event.translationY,
            0,
          );
        })
        .onEnd(event => {
          if (
            profileNotificationImageScale.value > 1.02 &&
            profileNotificationImageGestureMode.value !== 2
          ) {
            const maxTranslateX = getImagePanBound(
              profileNotificationImageBaseWidth.value,
              profileNotificationImageScale.value,
            );
            const maxTranslateY = getImagePanBound(
              profileNotificationImageBaseHeight.value,
              profileNotificationImageScale.value,
            );

            profileNotificationImageTranslateX.value = withSpring(
              clampValue(
                profileNotificationImageTranslateX.value,
                -maxTranslateX,
                maxTranslateX,
              ),
              {
                damping: 24,
                stiffness: 220,
                mass: 0.9,
              },
            );
            profileNotificationImageTranslateY.value = withSpring(
              clampValue(
                profileNotificationImageTranslateY.value,
                -maxTranslateY,
                maxTranslateY,
              ),
              {
                damping: 24,
                stiffness: 220,
                mass: 0.9,
              },
            );
            profileNotificationImageGestureMode.value = 0;
            return;
          }

          const shouldClose =
            event.translationY > PROFILE_NOTIFICATION_IMAGE_CLOSE_DISTANCE ||
            event.velocityY > PROFILE_NOTIFICATION_IMAGE_CLOSE_VELOCITY;

          if (shouldClose) {
            profileNotificationImageGestureMode.value = 0;
            runOnJS(dismissProfileNotificationImageViewerFromDrag)();
            return;
          }

          profileNotificationImageGestureMode.value = 0;
          runOnJS(resetProfileNotificationImageViewerPosition)();
        }),
    [
      dismissProfileNotificationImageViewerFromDrag,
      profileNotificationImageBaseHeight,
      profileNotificationImageBaseWidth,
      profileNotificationImageGestureMode,
      profileNotificationImagePanStartX,
      profileNotificationImagePanStartY,
      profileNotificationImageScale,
      profileNotificationImageTranslateX,
      profileNotificationImageTranslateY,
      resetProfileNotificationImageViewerPosition,
    ],
  );

  const profileNotificationImageViewerGesture = React.useMemo(
    () =>
      Gesture.Simultaneous(
        profileNotificationImageTapGesture,
        profileNotificationImagePinchGesture,
        profileNotificationImagePanGesture,
      ),
    [
      profileNotificationImagePanGesture,
      profileNotificationImagePinchGesture,
      profileNotificationImageTapGesture,
    ],
  );

  const loadSessionNotifications = React.useCallback(
    async (employeeId: string) => {
      const notifications = await notificationsApi.list(employeeId);
      const unreadCount = notifications.filter(
        notification => !notification.is_read,
      ).length;
      setProfileNotifications(notifications);
      setProfileNotificationsCount(unreadCount);
      emitNotificationsUnreadCountChanged({ employeeId, unreadCount });
      return notifications;
    },
    [],
  );

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

  useEffect(() => {
    handledPushOpenMessageIdsRef.current.clear();
    hasCheckedInitialPushOpenRef.current = false;
  }, [session?.user.id]);

  const registerProfileNotificationSwipeable = React.useCallback(
    (notificationId: number, instance: any | null) => {
      if (instance) {
        profileNotificationSwipeablesRef.current.set(notificationId, instance);
        return;
      }

      profileNotificationSwipeablesRef.current.delete(notificationId);
      if (openedProfileNotificationIdRef.current === notificationId) {
        openedProfileNotificationIdRef.current = null;
      }
    },
    [],
  );

  const closeOpenedProfileNotification = React.useCallback(
    (exceptId?: number) => {
      const openedId = openedProfileNotificationIdRef.current;

      if (openedId === null || openedId === exceptId) {
        return;
      }

      openedProfileNotificationIdRef.current = null;
      profileNotificationSwipeablesRef.current.get(openedId)?.close();
    },
    [],
  );

  const handleProfileNotificationSwipeOpenStart = React.useCallback(
    (notificationId: number) => {
      closeOpenedProfileNotification(notificationId);
    },
    [closeOpenedProfileNotification],
  );

  const handleProfileNotificationSwipeCloseStart =
    React.useCallback(() => {}, []);

  const handleProfileNotificationSwipeOpened = React.useCallback(
    (notificationId: number) => {
      openedProfileNotificationIdRef.current = notificationId;
    },
    [],
  );

  const handleProfileNotificationSwipeClosed = React.useCallback(
    (notificationId: number) => {
      if (openedProfileNotificationIdRef.current === notificationId) {
        openedProfileNotificationIdRef.current = null;
      }
    },
    [],
  );

  const authIsMaterial = isAndroid && androidTheme.mode === 'material';
  const supportsMaterialSystemColors =
    isAndroid && authIsMaterial && Number(Platform.Version) >= 31;
  const authBackgroundHex =
    isAndroid && androidPalette
      ? androidTheme.mode === 'company'
        ? '#000000'
        : getAndroidStatusBarColor(colorScheme === 'dark')
      : '#000000';
  const authBackground = supportsMaterialSystemColors
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral1_900'
          : '@android:color/system_neutral1_10',
      )
    : authBackgroundHex;
  const authSurfaceMuted = supportsMaterialSystemColors
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
  const authBorder = supportsMaterialSystemColors
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
  const authText = supportsMaterialSystemColors
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral1_50'
          : '@android:color/system_neutral1_900',
      )
    : isAndroid && androidPalette
    ? String(androidPalette.onSurface)
    : '#FFFFFF';
  const authMutedText = supportsMaterialSystemColors
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral2_200'
          : '@android:color/system_neutral2_700',
      )
    : isAndroid && androidPalette
    ? String(androidPalette.onSurfaceMuted)
    : '#A6A6A6';
  const authPlaceholder = authMutedText;
  const authAccent = supportsMaterialSystemColors
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_accent1_300'
          : '@android:color/system_accent1_500',
      )
    : isAndroid && androidPalette
    ? String(androidPalette.primary)
    : '#FF6A00';
  const authOnAccent = supportsMaterialSystemColors
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
  const authButtonBackground = supportsMaterialSystemColors
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_accent1_800'
          : '@android:color/system_accent1_100',
      )
    : isAndroid && androidPalette && authIsMaterial
    ? String(androidPalette.primaryContainerStrong)
    : authAccent;
  const authButtonBorder = supportsMaterialSystemColors
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
  const authBrandCapsuleBackground = supportsMaterialSystemColors
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral1_800'
          : '@android:color/system_neutral1_0',
      )
    : isAndroid && androidPalette && authIsMaterial
    ? String(androidPalette.surfaceRaised)
    : '#111111';
  const authBrandCapsuleBorder = supportsMaterialSystemColors
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
    setProfileInitialRoute('root');
    setIsProfileSheetOpen(true);
    setProfileSheetRoute('root');
    setIsPasswordSectionOpen(false);
    profileSheetProgress.stopAnimation();
    profileSheetDragY.stopAnimation();
    profileSheetProgress.setValue(0);
    profileSheetDragY.setValue(0);
    Animated.spring(profileSheetProgress, {
      toValue: 1,
      stiffness: 220,
      damping: 22,
      mass: 0.95,
      overshootClamping: false,
      useNativeDriver: true,
    }).start();
  }, [profileSheetDragY, profileSheetProgress]);

  const closeProfileSheet = React.useCallback(() => {
    profileSheetDragY.stopAnimation();
    profileSheetDragY.setValue(0);
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
        setProfileSheetRoute('root');
        setSelectedProfileNotification(null);
        closeProfileNotificationImageViewer();
      }
    });
  }, [
    closeProfileNotificationImageViewer,
    profileSheetDragY,
    profileSheetProgress,
  ]);

  const dismissProfileSheetFromDrag = React.useCallback(() => {
    profileSheetProgress.stopAnimation();
    profileSheetDragY.stopAnimation();
    Animated.timing(profileSheetDragY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        profileSheetProgress.setValue(0);
        profileSheetDragY.setValue(0);
        setIsProfileSheetOpen(false);
        setProfileSheetRoute('root');
        setSelectedProfileNotification(null);
        closeProfileNotificationImageViewer();
      }
    });
  }, [
    closeProfileNotificationImageViewer,
    profileSheetDragY,
    profileSheetProgress,
  ]);

  const profileSheetDismissResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          const isVerticalPull =
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2;
          return gestureState.dy > 12 && isVerticalPull;
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextOffset =
            gestureState.dy > 0 ? gestureState.dy : gestureState.dy * 0.18;
          profileSheetDragY.setValue(nextOffset);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const shouldClose =
            gestureState.dy > PROFILE_SHEET_DISMISS_THRESHOLD &&
            Math.abs(gestureState.dx) < 56;

          if (shouldClose) {
            dismissProfileSheetFromDrag();
            return;
          }

          Animated.spring(profileSheetDragY, {
            toValue: 0,
            stiffness: 260,
            damping: 26,
            mass: 0.9,
            overshootClamping: false,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(profileSheetDragY, {
            toValue: 0,
            stiffness: 260,
            damping: 26,
            mass: 0.9,
            overshootClamping: false,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dismissProfileSheetFromDrag, profileSheetDragY],
  );

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

  const handleRefreshProfileNotifications = React.useCallback(async () => {
    if (!session) {
      return;
    }

    setIsRefreshingProfileNotifications(true);
    closeOpenedProfileNotification();
    setProfileNotificationsPullDistance(0);
    triggerHaptic('impactLight', {
      enableVibrateFallback: false,
      ignoreAndroidSystemSettings: false,
    });

    try {
      await loadSessionNotifications(session.user.id);
    } catch {
      setProfileNotifications([]);
      setProfileNotificationsCount(0);
    } finally {
      setIsRefreshingProfileNotifications(false);
      setIsProfileNotificationsPulling(false);
      setProfileNotificationsPullDistance(0);
    }
  }, [closeOpenedProfileNotification, loadSessionNotifications, session]);

  const handleProfileNotificationPress = React.useCallback(
    async (notification: NotificationItem) => {
      if (!session) {
        return;
      }

      closeOpenedProfileNotification();
      const optimisticReadAt = notification.read_at || new Date().toISOString();
      const notificationToOpen = notification.is_read
        ? notification
        : {
            ...notification,
            is_read: true,
            read_at: optimisticReadAt,
          };

      setSelectedProfileNotification(notificationToOpen);
      setProfileSheetRoute('notification-detail');

      if (notification.is_read) {
        return;
      }

      setProfileNotifications(prev =>
        prev.map(item =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
                read_at: item.read_at || optimisticReadAt,
              }
            : item,
        ),
      );
      setProfileNotificationsCount(prev => {
        const nextCount = Math.max(0, prev - 1);
        emitNotificationsUnreadCountChanged({
          employeeId: session.user.id,
          unreadCount: nextCount,
        });
        return nextCount;
      });

      setActiveProfileNotificationId(notification.id);

      try {
        await notificationsApi.markRead(session.user.id, notification.id);
      } catch (requestError) {
        console.error('Failed to mark notification as read', requestError);
        setProfileNotifications(prev =>
          prev.map(item => (item.id === notification.id ? notification : item)),
        );
        setSelectedProfileNotification(prev =>
          prev && prev.id === notification.id ? notification : prev,
        );
        setProfileNotificationsCount(prev => {
          const nextCount = prev + 1;
          emitNotificationsUnreadCountChanged({
            employeeId: session.user.id,
            unreadCount: nextCount,
          });
          return nextCount;
        });
      } finally {
        setActiveProfileNotificationId(null);
      }
    },
    [closeOpenedProfileNotification, session],
  );

  const handleOpenNotificationFromPush = React.useCallback(
    async (message: FirebaseMessagingTypes.RemoteMessage) => {
      if (!session) {
        return;
      }

      const messageKey = getPushNotificationOpenMessageKey(message);
      if (messageKey) {
        const now = Date.now();
        const lastHandledAt =
          handledPushOpenMessageIdsRef.current.get(messageKey);

        if (lastHandledAt && now - lastHandledAt < 2500) {
          return;
        }

        handledPushOpenMessageIdsRef.current.set(messageKey, now);
      }

      try {
        openProfileSheet();
        const notifications = await loadSessionNotifications(session.user.id);
        const matchedNotification = findNotificationFromPushMessage(
          notifications,
          message,
        );

        if (matchedNotification) {
          await handleProfileNotificationPress(matchedNotification);
          return;
        }

        setSelectedProfileNotification(null);
        setProfileSheetRoute('notifications');
      } catch (requestError) {
        if (messageKey) {
          handledPushOpenMessageIdsRef.current.delete(messageKey);
        }
        console.error('Failed to open notification from push', requestError);
      }
    },
    [
      handleProfileNotificationPress,
      loadSessionNotifications,
      openProfileSheet,
      session,
    ],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    const employeeId = session.user.id;
    let isMounted = true;

    async function syncProfileNotifications(showLoader: boolean) {
      if (showLoader) {
        setIsProfileNotificationsLoading(true);
      }

      try {
        const res = await fetch(
          buildApiUrl(
            `/employees/${encodeURIComponent(employeeId)}/hr/regions`,
          ),
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
          await loadSessionNotifications(employeeId);
        }
      } catch {
        if (isMounted) {
          setProfileNotifications([]);
          setProfileNotificationsCount(0);
        }
      } finally {
        if (isMounted && showLoader) {
          setIsProfileNotificationsLoading(false);
        }
      }
    }

    void syncProfileNotifications(true);


    const unsubscribeForegroundMessages = subscribeToForegroundPushMessages(
      () => {
        if (!isMounted) {
          return;
        }

        void syncProfileNotifications(false);
      },
    );

    const unsubscribePushOpens = subscribeToPushNotificationOpens(
      remoteMessage => {
        if (!isMounted) {
          return;
        }

        void handleOpenNotificationFromPush(remoteMessage);
      },
    );

    if (!hasCheckedInitialPushOpenRef.current) {
      hasCheckedInitialPushOpenRef.current = true;

      void (async () => {
        try {
          const initialPushMessage = await getInitialPushNotification();
          if (isMounted && initialPushMessage) {
            await handleOpenNotificationFromPush(initialPushMessage);
          }
        } catch (requestError) {
          console.error(
            'Failed to restore initial push notification',
            requestError,
          );
        }
      })();
    }

    return () => {
      isMounted = false;
      unsubscribeForegroundMessages();
      unsubscribePushOpens();
    };
  }, [handleOpenNotificationFromPush, loadSessionNotifications, session]);

  const handleMarkAllProfileNotificationsRead = React.useCallback(async () => {
    if (!session || profileNotificationsCount === 0) {
      return;
    }

    closeOpenedProfileNotification();
    setIsMarkingAllProfileNotificationsRead(true);

    try {
      await notificationsApi.markAllRead(session.user.id);
      const now = new Date().toISOString();
      setProfileNotifications(prev =>
        prev.map(item =>
          item.is_read
            ? item
            : {
                ...item,
                is_read: true,
                read_at: item.read_at || now,
              },
        ),
      );
      setProfileNotificationsCount(0);
      emitNotificationsUnreadCountChanged({
        employeeId: session.user.id,
        unreadCount: 0,
      });
    } finally {
      setIsMarkingAllProfileNotificationsRead(false);
    }
  }, [closeOpenedProfileNotification, profileNotificationsCount, session]);

  const handleDeleteProfileNotification = React.useCallback(
    async (notification: NotificationItem) => {
      if (!session) {
        return;
      }

      closeOpenedProfileNotification();
      setDeletingProfileNotificationId(notification.id);

      try {
        await notificationsApi.remove(session.user.id, notification.id);
        setProfileNotifications(prev =>
          prev.filter(item => item.id !== notification.id),
        );
        setProfileNotificationsCount(prev => {
          const nextCount = notification.is_read ? prev : Math.max(0, prev - 1);
          emitNotificationsUnreadCountChanged({
            employeeId: session.user.id,
            unreadCount: nextCount,
          });
          return nextCount;
        });
      } catch (requestError) {
        console.error('Failed to delete notification', requestError);
      } finally {
        setDeletingProfileNotificationId(null);
      }
    },
    [closeOpenedProfileNotification, session],
  );

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
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось отправить код';
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
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось сбросить пароль';
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
    const profileLetter = (
      session.user.email?.trim()?.charAt(0) || 'П'
    ).toUpperCase();
    const profileStatusBarStyle =
      isAndroid && androidPalette
        ? getAndroidStatusBarStyle(
            androidTheme.mode === 'company'
              ? '#000000'
              : getAndroidStatusBarColor(colorScheme === 'dark'),
          )
        : 'light-content';
    const isAndroidMaterialMode = isAndroid && androidTheme.mode === 'material';
    const isAndroidMaterialDark =
      isAndroidMaterialMode && colorScheme === 'dark';
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
    const profileOverlayBaseOpacity = profileSheetProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.32],
      extrapolate: 'clamp',
    });
    const profileSheetDismissOpacity = profileSheetDragY.interpolate({
      inputRange: [-48, 0, 260],
      outputRange: [1, 1, 0],
      extrapolate: 'clamp',
    });
    const profileOverlayOpacity = Animated.multiply(
      profileOverlayBaseOpacity,
      profileSheetDismissOpacity,
    );
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
    const profileSheetDragScale = profileSheetDragY.interpolate({
      inputRange: [-48, 0, 240],
      outputRange: [1.006, 1, 0.978],
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
      Platform.OS === 'android' ? SCREEN_WIDTH * 0.125 : SCREEN_WIDTH * 0.14;

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
      <Animated.View
        style={[styles.authenticatedScreen, appShellAnimatedStyle]}
      >
        <Animated.View
          style={[styles.homeLayer, homeTabAnimatedStyle]}
          pointerEvents={activeTab === 'home' ? 'auto' : 'none'}
        >
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
            onGoHome={() => {
              setProfileInitialRoute('root');
              setActiveTab('home');
            }}
            onGoMail={() => setActiveTab('mail')}
            onOpenCertificates={() => setIsCertificatesModalVisible(true)}
            onGoTrash={() => setActiveTab('trash')}
            onGoProfile={openProfileSheet}
            onOpenHouseholdOrders={() => {
              setProfileInitialRoute('household-order');
              setActiveTab('profile');
            }}
            activeTab={activeTab === 'home' ? 'home' : activeTab}
            showHeaderActions={false}
            showTabBar={false}
          />
        </Animated.View>

        <Animated.View
          style={[styles.tabLayer, mailTabAnimatedStyle]}
          pointerEvents={showMail ? 'auto' : 'none'}
        >
          <TasksScreen employeeId={session.user.id} isActive={showMail} />
        </Animated.View>

        <Animated.View
          style={[styles.tabLayer, trashTabAnimatedStyle]}
          pointerEvents={showTrash ? 'auto' : 'none'}
        >
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
              ]}
            >
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
          pointerEvents={showProfile ? 'auto' : 'none'}
        >
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
            edges={['top', 'bottom']}
          >
            <StatusBar barStyle={profileStatusBarStyle} />
            <MoreScreen
              employeeId={session.user.id}
              userRole={Number(session.user.userRole ?? 3)}
              initialRoute={profileInitialRoute}
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
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeProfileSheet}
            >
              <Animated.View
                style={[
                  styles.profileSheetBackdrop,
                  { opacity: profileOverlayOpacity },
                ]}
              />
            </Pressable>

            <Animated.View
              style={[
                styles.profileSheetCard,
                {
                  backgroundColor: profileSheetSurface,
                  borderColor: profileBorder,
                  top: insets.top + 6,
                  transform: [
                    {
                      translateY: Animated.add(
                        profileSheetTranslateY,
                        profileSheetDragY,
                      ),
                    },
                    {
                      scale: Animated.multiply(
                        profileSheetScale,
                        profileSheetDragScale,
                      ),
                    },
                  ],
                },
              ]}
            >
              {!isProfileNotificationImageViewerOpen ? (
                <TouchableOpacity
                  style={styles.profileSheetCloseButton}
                  onPress={closeProfileSheet}
                  accessibilityRole="button"
                  accessibilityLabel="Закрыть профиль"
                >
                  <Image
                    source={crossIcon}
                    style={styles.profileSheetCloseIcon}
                  />
                </TouchableOpacity>
              ) : null}
              {profileSheetRoute !== 'root' &&
              !isProfileNotificationImageViewerOpen ? (
                <TouchableOpacity
                  style={styles.profileSheetBackButton}
                  onPress={() => {
                    if (profileSheetRoute === 'notification-detail') {
                      setProfileSheetRoute('notifications');
                      return;
                    }

                    setProfileSheetRoute('root');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Вернуться в профиль"
                >
                  <Text style={styles.profileSheetBackButtonText}>‹</Text>
                </TouchableOpacity>
              ) : null}
              {profileSheetRoute === 'notifications' ? (
                <View
                  style={styles.profileSheetHeaderTitleWrap}
                  {...profileSheetDismissResponder.panHandlers}
                >
                  <Text style={styles.profileSheetHeaderTitle}>
                    Центр уведомлений
                  </Text>
                </View>
              ) : profileSheetRoute === 'notification-detail' &&
                !isProfileNotificationImageViewerOpen ? (
                <View
                  style={styles.profileSheetHeaderTitleWrap}
                  {...profileSheetDismissResponder.panHandlers}
                >
                  <Text style={styles.profileSheetHeaderTitle}>
                    Уведомление
                  </Text>
                </View>
              ) : isProfileNotificationImageViewerOpen ? null : (
                <View
                  style={styles.profileSheetHeaderTitleWrap}
                  {...profileSheetDismissResponder.panHandlers}
                >
                  <Text style={styles.profileSheetHeaderTitle}>Уч. запись</Text>
                </View>
              )}

              <SafeAreaView
                style={styles.profileSheetSafeArea}
                edges={
                  profileSheetRoute === 'root' ? ['top', 'bottom'] : ['top']
                }
              >
                <View
                  style={[
                    styles.profileSheetContent,
                    profileSheetRoute !== 'root' &&
                      styles.profileSheetContentNotifications,
                  ]}
                >
                  {profileSheetRoute === 'notifications' ? (
                    <>
                      <View
                        style={[
                          styles.profileNotificationsListWrap,
                          styles.profileNotificationsListWrapNotifications,
                        ]}
                      >
                        {isRefreshingProfileNotifications ||
                        (isProfileNotificationsPulling &&
                          profileNotificationsPullDistance > 0) ? (
                          <View
                            style={[
                              styles.profileNotificationsRefreshCard,
                              !isRefreshingProfileNotifications &&
                                isProfileNotificationsPulling && {
                                  opacity: Math.min(
                                    profileNotificationsPullDistance / 72,
                                    1,
                                  ),
                                },
                            ]}
                            pointerEvents="none"
                          >
                            <ActivityIndicator size="small" color="#FF6A00" />
                          </View>
                        ) : null}

                        <ScrollView
                          style={styles.profileNotificationsList}
                          contentContainerStyle={[
                            styles.profileNotificationsListContent,
                            styles.profileNotificationsListContentNotifications,
                          ]}
                          directionalLockEnabled
                          scrollEnabled={!isProfileNotificationSwipeActive}
                          onScroll={event => {
                            if (
                              isRefreshingProfileNotifications ||
                              isProfileNotificationsLoading
                            ) {
                              return;
                            }

                            const offsetY = event.nativeEvent.contentOffset.y;
                            setProfileNotificationsPullDistance(
                              offsetY < 0 ? Math.min(-offsetY, 96) : 0,
                            );
                          }}
                          onScrollBeginDrag={() => {
                            setIsProfileNotificationsPulling(true);
                            closeOpenedProfileNotification();
                          }}
                          onScrollEndDrag={event => {
                            const offsetY = event.nativeEvent.contentOffset.y;

                            if (
                              offsetY <= -76 &&
                              !isRefreshingProfileNotifications &&
                              !isProfileNotificationsLoading
                            ) {
                              void handleRefreshProfileNotifications();
                              return;
                            }

                            setIsProfileNotificationsPulling(false);
                            setProfileNotificationsPullDistance(0);
                          }}
                          onMomentumScrollEnd={() => {
                            setIsProfileNotificationsPulling(false);
                            if (!isRefreshingProfileNotifications) {
                              setProfileNotificationsPullDistance(0);
                            }
                          }}
                          scrollEventThrottle={16}
                          showsVerticalScrollIndicator={false}
                        >
                          {isProfileNotificationsLoading &&
                          profileNotifications.length === 0 ? (
                            <View style={styles.profileNotificationsEmptyCard}>
                              <ActivityIndicator size="small" color="#FF6A00" />
                            </View>
                          ) : profileNotifications.length === 0 ? (
                            <View
                              style={styles.profileNotificationsEmptyStateCard}
                            >
                              <View
                                style={styles.profileNotificationsEmptyAccent}
                              />
                              <Text
                                style={
                                  styles.profileNotificationsEmptyStateTitle
                                }
                              >
                                Тут пока пусто
                              </Text>
                              <Text
                                style={
                                  styles.profileNotificationsEmptyStateText
                                }
                              >
                                Новые уведомления появятся здесь
                              </Text>
                            </View>
                          ) : (
                            profileNotifications.map(notification => {
                              const isBusy =
                                activeProfileNotificationId ===
                                  notification.id ||
                                deletingProfileNotificationId ===
                                  notification.id;

                              return (
                                <ProfileNotificationRow
                                  key={notification.id}
                                  notification={notification}
                                  isBusy={isBusy}
                                  onPress={item => {
                                    void handleProfileNotificationPress(item);
                                  }}
                                  onDelete={item => {
                                    void handleDeleteProfileNotification(item);
                                  }}
                                  onRegisterSwipeable={
                                    registerProfileNotificationSwipeable
                                  }
                                  onSwipeOpenStart={
                                    handleProfileNotificationSwipeOpenStart
                                  }
                                  onSwipeCloseStart={
                                    handleProfileNotificationSwipeCloseStart
                                  }
                                  onSwipeOpened={
                                    handleProfileNotificationSwipeOpened
                                  }
                                  onSwipeClosed={
                                    handleProfileNotificationSwipeClosed
                                  }
                                  onSwipeActiveChange={
                                    setIsProfileNotificationSwipeActive
                                  }
                                />
                              );
                            })
                          )}
                        </ScrollView>
                      </View>
                    </>
                  ) : profileSheetRoute === 'notification-detail' ? (
                    <View style={styles.profileNotificationDetailScreen}>
                      <ScrollView
                        style={styles.profileNotificationDetailScroll}
                        contentContainerStyle={
                          styles.profileNotificationDetailContent
                        }
                        {...profileNotificationDetailSwipeResponder.panHandlers}
                        pointerEvents={
                          isProfileNotificationImageViewerOpen ? 'none' : 'auto'
                        }
                        scrollEnabled={!isProfileNotificationImageViewerOpen}
                        showsVerticalScrollIndicator={false}
                      >
                        {selectedProfileNotification ? (
                          <View style={styles.profileNotificationDetailCard}>
                            {!selectedProfileNotification.is_read ? (
                              <View
                                style={styles.profileNotificationUnreadStripe}
                              />
                            ) : null}
                            <Text style={styles.profileNotificationDetailMeta}>
                              {formatNotificationTimestamp(
                                selectedProfileNotification,
                              )}
                            </Text>
                            <Text style={styles.profileNotificationDetailTitle}>
                              {selectedProfileNotification.title ||
                                'Уведомление'}
                            </Text>
                            <Text style={styles.profileNotificationDetailBody}>
                              {selectedProfileNotification.body ||
                                'Текст уведомления не указан'}
                            </Text>

                            {getNotificationPayloadImageUrl(
                              selectedProfileNotification.payload,
                              'photo_opening_check',
                            ) ||
                            getNotificationPayloadImageUrl(
                              selectedProfileNotification.payload,
                              'photo_opening_em',
                            ) ? (
                              <View
                                style={[
                                  styles.profileNotificationDetailGalleryBlock,
                                  isProfileNotificationImageViewerOpen &&
                                    styles.profileNotificationDetailGalleryBlockHidden,
                                ]}
                                pointerEvents={
                                  isProfileNotificationImageViewerOpen
                                    ? 'none'
                                    : 'auto'
                                }
                              >
                                {getNotificationPayloadImageUrl(
                                  selectedProfileNotification.payload,
                                  'photo_opening_check',
                                ) ? (
                                  <TouchableOpacity
                                    style={
                                      styles.profileNotificationDetailGalleryItem
                                    }
                                    activeOpacity={0.95}
                                    onPress={() => {
                                      const imageUrl =
                                        getNotificationPayloadImageUrl(
                                          selectedProfileNotification.payload,
                                          'photo_opening_check',
                                        );
                                      if (imageUrl) {
                                        openProfileNotificationImageViewer(
                                          imageUrl,
                                        );
                                      }
                                    }}
                                  >
                                    <Image
                                      source={{
                                        uri:
                                          getNotificationPayloadImageUrl(
                                            selectedProfileNotification.payload,
                                            'photo_opening_check',
                                          ) || undefined,
                                      }}
                                      style={
                                        styles.profileNotificationDetailGalleryImage
                                      }
                                    />
                                  </TouchableOpacity>
                                ) : null}

                                {getNotificationPayloadImageUrl(
                                  selectedProfileNotification.payload,
                                  'photo_opening_em',
                                ) ? (
                                  <TouchableOpacity
                                    style={
                                      styles.profileNotificationDetailGalleryItem
                                    }
                                    activeOpacity={0.95}
                                    onPress={() => {
                                      const imageUrl =
                                        getNotificationPayloadImageUrl(
                                          selectedProfileNotification.payload,
                                          'photo_opening_em',
                                        );
                                      if (imageUrl) {
                                        openProfileNotificationImageViewer(
                                          imageUrl,
                                        );
                                      }
                                    }}
                                  >
                                    <Image
                                      source={{
                                        uri:
                                          getNotificationPayloadImageUrl(
                                            selectedProfileNotification.payload,
                                            'photo_opening_em',
                                          ) || undefined,
                                      }}
                                      style={
                                        styles.profileNotificationDetailGalleryImage
                                      }
                                    />
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <View
                            style={styles.profileNotificationsEmptyStateCard}
                          >
                            <View
                              style={styles.profileNotificationsEmptyAccent}
                            />
                            <Text
                              style={styles.profileNotificationsEmptyStateTitle}
                            >
                              Тут пока пусто
                            </Text>
                            <Text
                              style={styles.profileNotificationsEmptyStateText}
                            >
                              Уведомление не найдено
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.profileAccountCard,
                          {
                            backgroundColor: profileSurface,
                            borderColor: profileBorder,
                          },
                        ]}
                      >
                        <View style={styles.profileAccountRow}>
                          <View
                            style={[
                              styles.profileAvatarCircle,
                              {
                                backgroundColor: profileSurfaceMuted,
                                borderColor: profileBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.profileAvatarLetter,
                                { color: profileText },
                              ]}
                            >
                              {profileLetter}
                            </Text>
                          </View>
                          <View style={styles.profileIdentityBlock}>
                            <Text
                              style={[
                                styles.profileAccountName,
                                { color: profileText },
                              ]}
                            >
                              {displayName}
                            </Text>
                            <Text
                              style={[
                                styles.profileAccountEmail,
                                { color: profileMutedText },
                              ]}
                            >
                              {profileEmail}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {!isPasswordSectionOpen ? (
                        <View
                          style={[
                            styles.profileActionsCard,
                            {
                              backgroundColor: profileSurface,
                              borderColor: profileBorder,
                            },
                          ]}
                        >
                          <>
                            <TouchableOpacity
                              style={styles.profileRowButton}
                              activeOpacity={0.65}
                              delayPressIn={0}
                              onPressIn={() => {
                                setProfileSheetRoute('notifications');
                              }}
                            >
                              <Text
                                style={[
                                  styles.profileRowButtonText,
                                  { color: profileText },
                                ]}
                              >
                                Уведомления
                              </Text>
                              <View
                                style={styles.profileNotificationsMetaInline}
                              >
                                {isProfileNotificationsLoading ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#FF6A00"
                                  />
                                ) : profileNotificationsCount > 0 ? (
                                  <View
                                    style={[
                                      styles.profileNotificationCountBadge,
                                      { backgroundColor: profileAccent },
                                    ]}
                                  >
                                    <Text
                                      style={
                                        styles.profileNotificationCountBadgeText
                                      }
                                    >
                                      {profileNotificationsCount > 99
                                        ? '99+'
                                        : profileNotificationsCount}
                                    </Text>
                                  </View>
                                ) : null}
                                <Text
                                  style={[
                                    styles.profileRowChevron,
                                    { color: profileAccent },
                                  ]}
                                >
                                  ›
                                </Text>
                              </View>
                            </TouchableOpacity>

                            <View
                              style={[
                                styles.profileDivider,
                                { backgroundColor: profileBorder },
                              ]}
                            />
                          </>

                          <TouchableOpacity
                            style={styles.profileRowButton}
                            activeOpacity={0.65}
                            delayPressIn={0}
                            onPress={() => {
                              setIsPasswordSectionOpen(true);
                              setChangePasswordError(null);
                              setChangePasswordSuccess(null);
                            }}
                            disabled={isChangingPassword}
                          >
                            <Text
                              style={[
                                styles.profileRowButtonText,
                                { color: profileText },
                              ]}
                            >
                              Смена пароля
                            </Text>
                            <Text
                              style={[
                                styles.profileRowChevron,
                                { color: profileAccent },
                              ]}
                            >
                              ›
                            </Text>
                          </TouchableOpacity>

                          <View
                            style={[
                              styles.profileDivider,
                              { backgroundColor: profileBorder },
                            ]}
                          />

                          <View style={styles.profileRowStatic}>
                            <Text
                              style={[
                                styles.profileRowMutedText,
                                { color: profileMutedText },
                              ]}
                            >
                              Скоро здесь появится больше возможностей
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
                          ]}
                        >
                          <View style={styles.profileForm}>
                            <View style={styles.passwordField}>
                              <TextInput
                                style={[
                                  styles.input,
                                  styles.passwordInput,
                                  styles.profileInput,
                                  focusedProfileField === 'oldPassword' &&
                                    styles.inputFocused,
                                ]}
                                placeholder="Старый пароль"
                                placeholderTextColor="#7A7A7A"
                                secureTextEntry={!isOldPasswordVisible}
                                autoCapitalize="none"
                                value={oldPassword}
                                onFocus={() =>
                                  setFocusedProfileField('oldPassword')
                                }
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
                                onPress={() =>
                                  setIsOldPasswordVisible(prev => !prev)
                                }
                                disabled={isChangingPassword}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  isOldPasswordVisible
                                    ? 'Скрыть старый пароль'
                                    : 'Показать старый пароль'
                                }
                              >
                                <Image
                                  source={
                                    isOldPasswordVisible
                                      ? eyeClosedIcon
                                      : eyeOpenIcon
                                  }
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
                                  focusedProfileField === 'newPassword' &&
                                    styles.inputFocused,
                                ]}
                                placeholder="Новый пароль"
                                placeholderTextColor="#7A7A7A"
                                secureTextEntry={!isNewPasswordVisible}
                                autoCapitalize="none"
                                value={newPassword}
                                onFocus={() =>
                                  setFocusedProfileField('newPassword')
                                }
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
                                onPress={() =>
                                  setIsNewPasswordVisible(prev => !prev)
                                }
                                disabled={isChangingPassword}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  isNewPasswordVisible
                                    ? 'Скрыть новый пароль'
                                    : 'Показать новый пароль'
                                }
                              >
                                <Image
                                  source={
                                    isNewPasswordVisible
                                      ? eyeClosedIcon
                                      : eyeOpenIcon
                                  }
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
                                ]}
                              >
                                <View style={styles.flashMessageLeft}>
                                  <View
                                    style={[
                                      styles.flashIconCircle,
                                      styles.flashIconCircleError,
                                    ]}
                                  >
                                    <Text style={styles.flashIconText}>!</Text>
                                  </View>
                                  <Text style={styles.flashMessageText}>
                                    {changePasswordError}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.flashCloseButton}
                                  onPress={() => setChangePasswordError(null)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Закрыть сообщение об ошибке"
                                >
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
                                ]}
                              >
                                <View style={styles.flashMessageLeft}>
                                  <View
                                    style={[
                                      styles.flashIconCircle,
                                      styles.flashIconCircleSuccess,
                                    ]}
                                  >
                                    <Text style={styles.flashIconText}>✓</Text>
                                  </View>
                                  <Text style={styles.flashMessageText}>
                                    {changePasswordSuccess}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.flashCloseButton}
                                  onPress={() => setChangePasswordSuccess(null)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Закрыть сообщение об успехе"
                                >
                                  <Text style={styles.flashCloseText}>✕</Text>
                                </TouchableOpacity>
                              </Animated.View>
                            ) : null}

                            <TouchableOpacity
                              style={[styles.button, styles.logoutButton]}
                              onPress={submitChangePassword}
                              disabled={isChangingPassword}
                            >
                              {isChangingPassword ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <Text style={styles.buttonText}>
                                  Сохранить пароль
                                </Text>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.linkButton}
                              onPress={resetChangePasswordForm}
                              disabled={isChangingPassword}
                            >
                              <Text style={styles.linkButtonText}>
                                Назад в профиль
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {profileSheetRoute === 'root' ? (
                    <View
                      style={[
                        styles.profileBottomBlock,
                        {
                          backgroundColor: profileSurface,
                          borderColor: profileBorder,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.profileLogoutButton}
                        onPress={() => {
                          resetChangePasswordForm();
                          closeProfileSheet();
                          setActiveTab('home');
                          resetSession();
                        }}
                      >
                        <Text style={styles.profileLogoutButtonText}>
                          Выйти
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </SafeAreaView>
            </Animated.View>
          </View>
        ) : null}

        <Modal
          visible={isProfileNotificationImageViewerOpen}
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          hardwareAccelerated
          statusBarTranslucent
          onRequestClose={closeProfileNotificationImageViewer}
        >
          <View
            style={styles.profileNotificationImageViewerScreen}
            pointerEvents="auto"
          >
            <AnimatedReanimated.View
              style={[
                styles.profileNotificationImageViewerBackdrop,
                profileNotificationImageViewerBackdropStyle,
              ]}
              pointerEvents="none"
            >
              <BlurView
                style={styles.profileNotificationImageViewerBlur}
                blurType={
                  Platform.OS === 'ios' ? 'ultraThinMaterialDark' : 'dark'
                }
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(18, 18, 20, 0.55)"
              />
              <View style={styles.profileNotificationImageViewerBackdropTint} />
            </AnimatedReanimated.View>
            {isProfileNotificationImageChromeVisible ? (
              <AnimatedReanimated.View
                style={[
                  styles.profileNotificationImageViewerTopBar,
                  profileNotificationImageViewerTopBarStyle,
                  {
                    paddingTop: insets.top + 6,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.profileNotificationImageViewerCloseButton}
                  onPress={closeProfileNotificationImageViewer}
                  accessibilityRole="button"
                  accessibilityLabel="Закрыть просмотр фото"
                >
                  <Text style={styles.profileNotificationImageViewerCloseText}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </AnimatedReanimated.View>
            ) : null}
            <View style={styles.profileNotificationImageViewerImageWrap}>
              <GestureDetector gesture={profileNotificationImageViewerGesture}>
                <AnimatedReanimated.View
                  style={[
                    styles.profileNotificationImageViewerSurface,
                    {
                      width: profileNotificationImageFrame.width,
                      height: profileNotificationImageFrame.height,
                    },
                    profileNotificationImageViewerSurfaceStyle,
                  ]}
                >
                  <Image
                    source={{
                      uri: selectedProfileNotificationImage || undefined,
                    }}
                    style={styles.profileNotificationImageViewerImage}
                    resizeMode="contain"
                    onLoadStart={() =>
                      setIsProfileNotificationImageLoading(true)
                    }
                    onLoad={event => {
                      const source = event.nativeEvent.source;

                      if (
                        source &&
                        typeof source.width === 'number' &&
                        typeof source.height === 'number' &&
                        source.width > 0 &&
                        source.height > 0
                      ) {
                        setSelectedProfileNotificationImageSize({
                          width: source.width,
                          height: source.height,
                        });
                      }
                    }}
                    onLoadEnd={() =>
                      setIsProfileNotificationImageLoading(false)
                    }
                  />
                </AnimatedReanimated.View>
              </GestureDetector>
              {isProfileNotificationImageLoading ? (
                <View style={styles.profileNotificationImageViewerLoader}>
                  <ActivityIndicator size="small" color="#FF6A00" />
                </View>
              ) : null}
            </View>
          </View>
        </Modal>

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

        <Modal
          visible={isCertificatesModalVisible}
          animationType="slide"
          transparent={false}
          presentationStyle="fullScreen"
          onRequestClose={() => setIsCertificatesModalVisible(false)}
        >
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
            edges={['top', 'bottom']}
          >
            <View style={styles.certificatesModalHeader}>
              <TouchableOpacity
                style={styles.certificatesModalBackButton}
                onPress={() => setIsCertificatesModalVisible(false)}
              >
                <Text style={styles.certificatesModalBackText}>Назад</Text>
              </TouchableOpacity>
              <Text style={styles.certificatesModalTitle}>Сертификаты</Text>
              <View style={styles.certificatesModalBackButtonPlaceholder} />
            </View>

            <CertificatesScreen
              employeeId={session.user.id}
              isActive={isCertificatesModalVisible}
              isShiftOpen={openedShift ? true : false}
              currentShopName={openedShift?.shopName ?? null}
            />
          </SafeAreaView>
        </Modal>
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: authBackground }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={authStatusBarStyle}
        backgroundColor={authBackgroundHex}
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Animated.View
          style={[
            styles.authContent,
            {
              backgroundColor: authBackground,
              justifyContent:
                isAndroid && isAuthKeyboardVisible ? 'flex-start' : 'center',
              paddingTop:
                isAndroid && isAuthKeyboardVisible
                  ? Math.max(insets.top + 72, 92)
                  : 0,
            },
            authScreenAnimatedStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.formCard,
              {
                transform: [{ translateY: authKeyboardShift }],
              },
            ]}
          >
            {isForgotPasswordFlow ? (
              <>
                <Text style={[styles.sectionTitle, { color: authText }]}>
                  Восстановление пароля
                </Text>
                {!isCodeSent ? (
                  <Pressable
                    style={[
                      styles.phoneInputWrap,
                      {
                        backgroundColor: authSurfaceMuted,
                        borderColor: authBorder,
                      },
                      focusedForgotField === 'identity' &&
                        authInputFocusedStyle,
                    ]}
                    onPress={() => forgotPhoneInputRef.current?.focus()}
                  >
                    <Text
                      style={[styles.phonePrefix, { color: authPlaceholder }]}
                      pointerEvents="none"
                    >
                      +7
                    </Text>
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
                        const caret =
                          formatLocalPhoneDisplay(forgotIdentity).length;
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
                      inputAccessoryViewID={
                        Platform.OS === 'ios' ? authAccessoryId : undefined
                      }
                      onChangeText={text => {
                        const nextDisplay = formatLocalPhoneInputWithBackspace(
                          formatLocalPhoneDisplay(forgotIdentity),
                          text,
                        );
                        const nextIdentifier = formatPhoneInput(
                          `+7${nextDisplay}`,
                        );
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
                      ]}
                    >
                      <View style={styles.flashMessageLeft}>
                        <View
                          style={[
                            styles.flashIconCircle,
                            styles.flashIconCircleError,
                          ]}
                        >
                          <Text style={styles.flashIconText}>!</Text>
                        </View>
                        <Text style={styles.flashMessageText}>
                          {forgotError}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.flashCloseButton}
                        onPress={() => setForgotError(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Закрыть сообщение об ошибке"
                      >
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
                      <Text
                        style={[styles.buttonText, { color: authOnAccent }]}
                      >
                        Получить код
                      </Text>
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
                      inputAccessoryViewID={
                        Platform.OS === 'ios' ? authAccessoryId : undefined
                      }
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
                          focusedForgotField === 'newPassword' &&
                            authInputFocusedStyle,
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
                        inputAccessoryViewID={
                          Platform.OS === 'ios' ? authAccessoryId : undefined
                        }
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
                          isResetPasswordVisible
                            ? 'Скрыть новый пароль'
                            : 'Показать новый пароль'
                        }
                      >
                        <Image
                          source={
                            isResetPasswordVisible ? eyeClosedIcon : eyeOpenIcon
                          }
                          style={[styles.eyeImage, { tintColor: authText }]}
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        {
                          backgroundColor: authAccent,
                          shadowColor: authAccent,
                        },
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
                        <Text
                          style={[styles.buttonText, { color: authOnAccent }]}
                        >
                          Сбросить пароль
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={resetForgotPasswordForm}
                  disabled={isForgotSubmitting}
                >
                  <Text style={[styles.linkButtonText, { color: authAccent }]}>
                    Назад
                  </Text>
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
                    ]}
                  >
                    <View
                      style={[
                        styles.brandMarkGlow,
                        { backgroundColor: authBrandGlow },
                      ]}
                    />
                    <View
                      style={[
                        styles.brandMarkDot,
                        { backgroundColor: authAccent },
                      ]}
                    />
                    <View
                      style={[
                        styles.brandMark,
                        { backgroundColor: authAccent },
                      ]}
                    />
                  </View>
                  <Text style={[styles.brandEyebrow, { color: authMutedText }]}>
                    платформа компании
                  </Text>
                  <Text style={[styles.brandTitle, { color: authText }]}>
                    Dr. Smoke
                  </Text>
                  <Text
                    style={[styles.brandSubtitle, { color: authMutedText }]}
                  >
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
                      focusedLoginField === 'identifier' &&
                        authInputFocusedStyle,
                    ]}
                    onPress={() => loginPhoneInputRef.current?.focus()}
                  >
                    <Text
                      style={[styles.phonePrefix, { color: authPlaceholder }]}
                      pointerEvents="none"
                    >
                      +7
                    </Text>
                    <TextInput
                      ref={loginPhoneInputRef}
                      style={[styles.phoneInputControl, { color: authText }]}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputAccessoryViewID={
                        Platform.OS === 'ios' ? authAccessoryId : undefined
                      }
                      returnKeyType="next"
                      value={formatLocalPhoneDisplay(form.identifier)}
                      maxLength={13}
                      selection={loginPhoneSelection}
                      onChangeText={text => {
                        const nextDisplay = formatLocalPhoneInputWithBackspace(
                          formatLocalPhoneDisplay(form.identifier),
                          text,
                        );
                        updateField(
                          'identifier',
                          formatPhoneInput(`+7${nextDisplay}`),
                        );
                        const caret = nextDisplay.length;
                        setLoginPhoneSelection({ start: caret, end: caret });
                        if (authNotice) {
                          setAuthNotice(null);
                        }
                      }}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      onFocus={() => {
                        setFocusedLoginField('identifier');
                        const caret = formatLocalPhoneDisplay(
                          form.identifier,
                        ).length;
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
                        focusedLoginField === 'password' &&
                          authInputFocusedStyle,
                      ]}
                      placeholder="Пароль"
                      placeholderTextColor={authPlaceholder}
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                      inputAccessoryViewID={
                        Platform.OS === 'ios' ? authAccessoryId : undefined
                      }
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
                      ]}
                    >
                      <View style={styles.flashMessageLeft}>
                        <View
                          style={[
                            styles.flashIconCircle,
                            styles.flashIconCircleSuccess,
                          ]}
                        >
                          <Text style={styles.flashIconText}>✓</Text>
                        </View>
                        <Text style={styles.flashMessageText}>
                          {authNotice}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.flashCloseButton}
                        onPress={() => setAuthNotice(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Закрыть сообщение об успехе"
                      >
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
                      ]}
                    >
                      <View style={styles.flashMessageLeft}>
                        <View
                          style={[
                            styles.flashIconCircle,
                            styles.flashIconCircleError,
                          ]}
                        >
                          <Text style={styles.flashIconText}>!</Text>
                        </View>
                        <Text style={styles.flashMessageText}>{error}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.flashCloseButton}
                        onPress={clearError}
                        accessibilityRole="button"
                        accessibilityLabel="Закрыть сообщение об ошибке"
                      >
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
                      <Text
                        style={[styles.buttonText, { color: authOnAccent }]}
                      >
                        Войти
                      </Text>
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
                    <Text
                      style={[styles.linkButtonText, { color: authAccent }]}
                    >
                      Забыли пароль?
                    </Text>
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
            <TouchableOpacity
              onPress={Keyboard.dismiss}
              style={styles.keyboardAccessoryButton}
            >
              <Text style={styles.keyboardAccessoryText}>Готово</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
  );
}
