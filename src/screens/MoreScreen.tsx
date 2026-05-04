import React from 'react';
import {
  Animated,
  ActivityIndicator,
  BackHandler,
  Easing,
  type ColorValue,
  type GestureResponderEvent,
  Image,
  type LayoutChangeEvent,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import {
  formatNotificationTimestamp,
  notificationsApi,
  type NotificationItem,
} from '../features/notifications/notificationsApi';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import AnimatedEntranceView from '../components/AnimatedEntranceView';
import { usePortalAccess } from '../features/portal/usePortalAccess';
import { blackBoxApi } from '../features/blackBox/blackBoxApi';
import { ideaApi } from '../features/idea/ideaApi';
import { householdApi } from '../features/household/householdApi';
import type {
  ExchangeOrderPayload,
  HouseholdCatalogItem,
  HouseholdOrderPayload,
} from '../features/household/types';
import { shiftApi } from '../features/shift/shiftApi';
import type { ShopOption } from '../features/shift/types';
import { useAndroidThemeMode } from '../theme/androidAppTheme';
import {
  type AndroidThemePalette,
  getAndroidCompanyPalette,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors';
import {
  androidPeakImpact,
  androidRustleHaptic,
} from '../utils/androidHaptics';
import { styles } from './MoreScreen.styles';

type MoreScreenRoute =
  | 'root'
  | 'appearance'
  | 'portal'
  | 'notifications'
  | 'preferences'
  | 'black-box'
  | 'idea'
  | 'household-order';

type GuideTopicKey =
  | 'shift'
  | 'certificates'
  | 'tasks'
  | 'products'
  | 'portal'
  | 'blackbox'
  | 'idea'
  | 'household';

type MoreScreenProps = {
  employeeId: string;
  userRole?: number;
  initialRoute?: MoreScreenRoute;
};

type HouseholdItemDraft = {
  id: string;
  catalogId: number;
  name: string;
  quantity: number;
};

type HouseholdOrderPreview = {
  employee_id: number | null;
  shop_name: string;
  priority: 'normal' | 'urgent';
  comment: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
  }>;
  source: 'mobile_app';
};
type RootMenuTab = 'appearance' | 'tools';
type HouseholdToolMode = 'goods' | 'exchange';

const PORTAL_URL = 'https://portal.dr-smoke.ru/';
const COMPANY_THEME_ACCENT = '#FF6A00';
const COMPANY_PREVIEW_COLORS = ['#050505', '#FF6A00', '#252525'] as const;
const HOUSEHOLD_CATALOG_PAGE_SIZE = 18;
const moreIcon = require('../assets/icons/more.png');
const lockIcon = require('../assets/icons/lock.png');

const GUIDE_TOPICS: Array<{
  key: GuideTopicKey;
  label: string;
  title: string;
  subtitle: string;
  steps: string[];
}> = [
  {
    key: 'shift',
    label: 'Смена',
    title: 'Открытие и закрытие смены',
    subtitle: 'Базовый сценарий ежедневной работы.',
    steps: [
      'Откройте смену: выберите магазин, загрузите фото и укажите размен.',
      'В конце смены заполните отчёт закрытия и отправьте чек закрытия.',
      'При опоздании применяется депремирование, при стрике без опозданий начисляются Dℂ.',
    ],
  },
  {
    key: 'certificates',
    label: 'Сертификаты',
    title: 'Работа с сертификатами',
    subtitle: 'Продажа и обналичивание в рамках открытой смены.',
    steps: [
      'Раздел доступен только при открытой смене.',
      'Для продажи заполните телефон партнёра, номер сертификата и номинал.',
      'Для обналичивания сначала выполните проверку сертификата, затем подтверждение.',
    ],
  },
  {
    key: 'tasks',
    label: 'Задачи',
    title: 'Работа с задачами',
    subtitle: 'Контроль назначенных и созданных задач.',
    steps: [
      'Во вкладке «Задачи» доступны списки «Назначены мне» и «Поставлены мной».',
      'Открывайте карточку задачи для просмотра срока и статуса.',
      'По завершению задача закрывается с фиксацией даты исполнения.',
    ],
  },
  {
    key: 'products',
    label: 'Товары',
    title: 'Проверка товара по 1С',
    subtitle: 'Поиск по штрихкоду или названию.',
    steps: [
      'Введите штрихкод или часть названия товара.',
      'Откройте найденную позицию для просмотра цены и деталей.',
      'При необходимости сбросьте состояние поиска кнопкой очистки.',
    ],
  },
  {
    key: 'portal',
    label: 'Портал',
    title: 'Доступ к веб-порталу',
    subtitle: 'Быстрый вход через PIN и подтверждение.',
    steps: [
      'Запустите вход на портал в одноимённом разделе.',
      'Используйте PIN-код для подтверждения сессии.',
      'При необходимости завершите текущую сессию в один тап.',
    ],
  },
  {
    key: 'blackbox',
    label: 'Чёрный ящик',
    title: 'Конфиденциальное обращение',
    subtitle: 'Передача сообщения руководству.',
    steps: [
      'Откройте раздел «Чёрный ящик».',
      'Введите текст обращения и отправьте.',
      'Сообщение уходит в закрытый контур получателей без публикации в общих разделах.',
    ],
  },
  {
    key: 'idea',
    label: 'Идея',
    title: 'У меня есть идея',
    subtitle: 'Инициатива сотрудника для руководства.',
    steps: [
      'Откройте раздел и опишите идею текстом.',
      'Отправьте предложение на модерацию.',
      'После решения руководства придёт ответ по принятому сценарию.',
    ],
  },
  {
    key: 'household',
    label: 'Хозтовары',
    title: 'Заказ хозтоваров',
    subtitle: 'Подготовка заявки для отправки на сервер.',
    steps: [
      'Выберите магазин и добавьте необходимые позиции.',
      'Укажите количество по каждой позиции и комментарий.',
      'Проверьте JSON предпросмотр перед отправкой в API.',
    ],
  },
];

const iosPalette: AndroidThemePalette = {
  background: '#000000',
  surface: '#121212',
  surfaceRaised: '#171717',
  surfaceMuted: '#1E1E21',
  surfaceAccent: '#1C1C1C',
  outline: '#2C2C2E',
  outlineVariant: '#262628',
  onSurface: '#FFFFFF',
  onSurfaceMuted: '#A1A1AA',
  primary: '#FF6A00',
  primaryStrong: '#FF8C38',
  secondary: '#C97B42',
  tertiary: '#7A5C46',
  primaryContainer: '#241409',
  primaryContainerStrong: '#2E1808',
  onPrimary: '#FFFFFF',
  error: '#FF7A7A',
  errorContainer: '#351313',
  errorBorder: '#6A2828',
  success: '#69D08E',
  successContainer: '#102317',
  successBorder: '#234130',
  buttonText: '#FFFFFF',
  closedBadge: '#24160B',
  closedBadgeBorder: '#503016',
  secondaryButton: '#1C1C1E',
};

function formatPortalExpiry(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function MoreNavGlyph({
  kind,
  color,
}: {
  kind:
    | 'appearance'
    | 'preferences'
    | 'portal'
    | 'idea'
    | 'black-box'
    | 'household'
    | 'notifications';
  color: ColorValue;
}) {
  const stroke = typeof color === 'string' ? color : '#FFFFFF';

  if (kind === 'appearance') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Rect
          x={2.5}
          y={5.5}
          width={8}
          height={10}
          rx={2.5}
          stroke={stroke}
          strokeWidth={1.7}
        />
        <Rect
          x={9.5}
          y={3.5}
          width={8}
          height={10}
          rx={2.5}
          stroke={stroke}
          strokeWidth={1.7}
        />
      </Svg>
    );
  }

  if (kind === 'preferences') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path
          d="M4 6H16"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <Path
          d="M4 10H16"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <Path
          d="M4 14H16"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <Circle cx={7} cy={6} r={1.8} fill={stroke} />
        <Circle cx={12.5} cy={10} r={1.8} fill={stroke} />
        <Circle cx={9} cy={14} r={1.8} fill={stroke} />
      </Svg>
    );
  }

  if (kind === 'idea') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path
          d="M10 3.2C7.24 3.2 5 5.44 5 8.2C5 10.08 6.03 11.72 7.56 12.58C7.9 12.78 8.1 13.14 8.1 13.53V14.3H11.9V13.53C11.9 13.14 12.1 12.78 12.44 12.58C13.97 11.72 15 10.08 15 8.2C15 5.44 12.76 3.2 10 3.2Z"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M8.4 16.2H11.6"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (kind === 'black-box') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Rect
          x={4}
          y={5}
          width={12}
          height={10}
          rx={2.5}
          stroke={stroke}
          strokeWidth={1.7}
        />
        <Path
          d="M8 8.6H12"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <Path
          d="M7.2 11.6H12.8"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (kind === 'household') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path
          d="M4.5 6H15.5L14.7 14.2C14.62 15.02 13.93 15.65 13.1 15.65H6.9C6.07 15.65 5.38 15.02 5.3 14.2L4.5 6Z"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
        <Path
          d="M7.3 6V4.9C7.3 3.96 8.06 3.2 9 3.2H11C11.94 3.2 12.7 3.96 12.7 4.9V6"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (kind === 'notifications') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path
          d="M6.4 8.3C6.4 6.31 8.01 4.7 10 4.7C11.99 4.7 13.6 6.31 13.6 8.3V10.18C13.6 10.86 13.84 11.52 14.28 12.04L14.9 12.78C15.53 13.52 15 14.65 14.03 14.65H5.97C5 14.65 4.47 13.52 5.1 12.78L5.72 12.04C6.16 11.52 6.4 10.86 6.4 10.18V8.3Z"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
        <Path
          d="M8.5 16C8.77 16.52 9.33 16.88 10 16.88C10.67 16.88 11.23 16.52 11.5 16"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7 4.5H5.8C4.81 4.5 4 5.31 4 6.3V13.7C4 14.69 4.81 15.5 5.8 15.5H7"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 10H16"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M13.2 7.2L16 10L13.2 12.8"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreNavIcon({
  kind,
  color,
}: {
  kind:
    | 'appearance'
    | 'preferences'
    | 'portal'
    | 'idea'
    | 'black-box'
    | 'household'
    | 'notifications';
  color: ColorValue;
}) {
  if (Platform.OS === 'ios' && (kind === 'appearance' || kind === 'preferences' || kind === 'portal')) {
    const iconSource = kind === 'portal' ? lockIcon : moreIcon;
    return (
      <Image
        source={iconSource}
        style={{
          width: 18,
          height: 18,
          tintColor: typeof color === 'string' ? color : '#FFFFFF',
          resizeMode: 'contain',
        }}
      />
    );
  }

  return <MoreNavGlyph kind={kind} color={color} />;
}

export default function MoreScreen({
  employeeId,
  userRole,
  initialRoute = 'root',
}: MoreScreenProps) {
  const colorScheme = useColorScheme();
  const androidTheme = useAndroidThemeMode();
  const isAndroid = Platform.OS === 'android';

  const [route, setRoute] = React.useState<MoreScreenRoute>(initialRoute);
  const [rootMenuTab, setRootMenuTab] = React.useState<RootMenuTab>('appearance');
  const canUseNotificationCenter = Number(userRole) === 10;
  const [activeGuideTopic, setActiveGuideTopic] =
    React.useState<GuideTopicKey>('shift');
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    [],
  );
  const [isNotificationsLoading, setIsNotificationsLoading] =
    React.useState(false);
  const [notificationError, setNotificationError] = React.useState<
    string | null
  >(null);
  const [activeNotificationId, setActiveNotificationId] = React.useState<
    number | null
  >(null);
  const [isMarkAllReadLoading, setIsMarkAllReadLoading] = React.useState(false);
  const [blackBoxMessage, setBlackBoxMessage] = React.useState('');
  const [blackBoxError, setBlackBoxError] = React.useState<string | null>(null);
  const [blackBoxSuccess, setBlackBoxSuccess] = React.useState<string | null>(null);
  const [isBlackBoxSubmitting, setIsBlackBoxSubmitting] = React.useState(false);
  const [ideaMessage, setIdeaMessage] = React.useState('');
  const [ideaError, setIdeaError] = React.useState<string | null>(null);
  const [ideaSuccess, setIdeaSuccess] = React.useState<string | null>(null);
  const [isIdeaSubmitting, setIsIdeaSubmitting] = React.useState(false);
  const [householdShops, setHouseholdShops] = React.useState<ShopOption[]>([]);
  const [isHouseholdShopsLoading, setIsHouseholdShopsLoading] = React.useState(false);
  const [householdShopsError, setHouseholdShopsError] = React.useState<string | null>(null);
  const [householdSelectedShopId, setHouseholdSelectedShopId] = React.useState<number | null>(null);
  const [householdToolMode, setHouseholdToolMode] = React.useState<HouseholdToolMode>('goods');
  const [householdComment, setHouseholdComment] = React.useState('');
  const [householdPriority, setHouseholdPriority] =
    React.useState<'normal' | 'urgent'>('normal');
  const [householdCatalogItems, setHouseholdCatalogItems] = React.useState<
    HouseholdCatalogItem[]
  >([]);
  const [isHouseholdCatalogLoading, setIsHouseholdCatalogLoading] =
    React.useState(false);
  const [householdCatalogError, setHouseholdCatalogError] = React.useState<string | null>(null);
  const [householdCatalogQuery, setHouseholdCatalogQuery] = React.useState('');
  const [householdCatalogVisibleCount, setHouseholdCatalogVisibleCount] =
    React.useState(HOUSEHOLD_CATALOG_PAGE_SIZE);
  const [householdItems, setHouseholdItems] = React.useState<HouseholdItemDraft[]>([]);
  const [exchangeAmount, setExchangeAmount] = React.useState('');
  const [exchangeComment, setExchangeComment] = React.useState('');
  const [householdError, setHouseholdError] = React.useState<string | null>(null);
  const [householdSuccess, setHouseholdSuccess] = React.useState<string | null>(null);
  const [isHouseholdSubmitting, setIsHouseholdSubmitting] = React.useState(false);
  const [householdApiStatus, setHouseholdApiStatus] = React.useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');
  const [exchangeApiStatus, setExchangeApiStatus] = React.useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');
  const holdTimersRef = React.useRef<number[]>([]);
  const holdCommittedRef = React.useRef(false);
  const [holdTarget, setHoldTarget] = React.useState<
    'company' | 'material' | null
  >(null);
  const [holdOrigin, setHoldOrigin] = React.useState<
    Record<'company' | 'material', { x: number; y: number }>
  >({
    company: { x: 0, y: 0 },
    material: { x: 0, y: 0 },
  });
  const [holdLayout, setHoldLayout] = React.useState<
    Record<'company' | 'material', { width: number; height: number }>
  >({
    company: { width: 1, height: 1 },
    material: { width: 1, height: 1 },
  });

  const palette = React.useMemo(() => {
    if (!isAndroid) {
      return iosPalette;
    }

    return androidTheme.mode === 'company'
      ? getAndroidCompanyPalette()
      : getAndroidThemePalette(
          colorScheme === 'dark',
          androidTheme.contrastMode,
        );
  }, [androidTheme.contrastMode, androidTheme.mode, colorScheme, isAndroid]);
  const materialPalette = React.useMemo(() => {
    if (!isAndroid) {
      return iosPalette;
    }

    return getAndroidThemePalette(
      colorScheme === 'dark',
      androidTheme.contrastMode,
    );
  }, [androidTheme.contrastMode, colorScheme, isAndroid]);
  const isCompanyMode = isAndroid && androidTheme.mode === 'company';
  const isMaterialMode = isAndroid && androidTheme.mode === 'material';
  const isSystemDark = colorScheme === 'dark';
  const isMaterialDark = isSystemDark;
  const materialPreviewAccent = materialPalette.primary;
  const accentTextColor = isCompanyMode
    ? palette.primaryStrong
    : isMaterialDark
    ? palette.onSurface
    : palette.primary;
  const subtleSurfaceColor = isCompanyMode
    ? palette.surfaceMuted
    : isMaterialDark
    ? palette.surface
    : palette.surfaceRaised;
  const rootCardBackground = isCompanyMode
    ? palette.surfaceRaised
    : subtleSurfaceColor;
  const heroCardBackground = isCompanyMode
    ? palette.surfaceRaised
    : isMaterialMode
    ? palette.surfaceRaised
    : rootCardBackground;
  const accentSurface = isCompanyMode
    ? palette.primaryContainerStrong
    : palette.primaryContainerStrong;
  const heroKickerColor = accentTextColor;
  const secondaryMutedColor = isMaterialDark
    ? palette.onSurfaceMuted
    : palette.onSurfaceMuted;
  const heroBorderColor = isCompanyMode
    ? palette.primaryContainerStrong
    : isMaterialMode && isMaterialDark
    ? palette.outline
    : isMaterialMode
    ? palette.primary
    : palette.outlineVariant;
  const portalHeroBackground = isCompanyMode
    ? palette.surfaceMuted
    : subtleSurfaceColor;
  const portalPanelBackground = isCompanyMode
    ? palette.surfaceRaised
    : palette.surfaceRaised;
  const portalSecondaryPanel = isCompanyMode
    ? palette.surface
    : subtleSurfaceColor;
  const ctaBackground = isCompanyMode
    ? palette.primary
    : isMaterialDark
    ? palette.primaryStrong
    : palette.primary;
  const ctaTextColor = palette.onPrimary;
  const ctaBorderColor = isCompanyMode
    ? palette.primaryStrong
    : isMaterialDark
    ? palette.primaryStrong
    : palette.primary;
  const materialSolidAccent = materialPalette.primary;
  const materialPreviewCardBackground = materialPalette.surfaceAccent;
  const materialPreviewCardSecondaryBackground =
    materialPalette.primaryContainer;
  const materialPreviewBorderColor = materialPalette.outline;
  const materialPreviewLineStrong = materialPalette.primary;
  const materialPreviewLineSoft = materialPalette.secondary;
  const companyCardAccent = COMPANY_THEME_ACCENT;
  const materialCardAccent = materialPalette.primary;
  const companyCardBackground = palette.surface;
  const materialCardBackground = isMaterialMode
    ? materialPalette.surface
    : palette.surface;
  const companyCardBorderColor = isCompanyMode
    ? companyCardAccent
    : palette.outlineVariant;
  const materialCardBorderColor = isMaterialMode
    ? materialPalette.outline
    : palette.outlineVariant;
  const companyBadgeBackground = isCompanyMode
    ? companyCardAccent
    : palette.surfaceMuted;
  const materialBadgePillBackground = isMaterialMode
    ? materialPalette.surfaceAccent
    : isSystemDark
    ? '#252D35'
    : '#E7EEF4';
  const companyBadgeTextColor = isCompanyMode
    ? palette.onPrimary
    : palette.onSurface;
  const materialBadgePillTextColor = isMaterialMode
    ? materialPalette.onSurface
    : isSystemDark
    ? '#EAF2F8'
    : '#23313D';
  const companyRadioBorderColor = isCompanyMode
    ? companyCardAccent
    : palette.outline;
  const materialRadioBorderColor = isMaterialMode
    ? materialPalette.primaryStrong
    : palette.outline;
  const activeCardShadowColor = isMaterialMode ? '#000000' : companyCardAccent;
  const activeCardShadowOpacity = isMaterialMode ? 0.06 : 0.1;
  const activeCardShadowRadius = 18;
  const activeCardElevation = 4;
  const backButtonBorderColor = isCompanyMode
    ? palette.primaryContainerStrong
    : palette.outlineVariant;
  const {
    session: portalSession,
    isLoading: isPortalLoading,
    isRefreshing: isPortalRefreshing,
    error: portalError,
    login: loginPortal,
    confirm: confirmPortal,
    logout: logoutPortal,
  } = usePortalAccess({
    employeeId,
    enabled: route === 'portal',
  });
  const portalStatusLabel =
    portalSession.status === 'active'
      ? 'Сессия активна'
      : portalSession.status === 'pending_confirm'
      ? 'Ожидает подтверждения'
      : 'Доступ не активирован';
  const portalActionLabel =
    portalSession.status === 'active'
      ? 'Завершить сессию'
      : portalSession.status === 'pending_confirm'
      ? 'Подтвердить вход'
      : 'Войти на портал';

  const unreadNotificationsCount = React.useMemo(
    () => notifications.filter(notification => !notification.is_read).length,
    [notifications],
  );
  const formattedPortalExpiry = formatPortalExpiry(portalSession.expiresAt);

  const openPortal = React.useCallback(() => {
    Linking.openURL(portalSession.portalUrl || PORTAL_URL).catch(() => {});
  }, [portalSession.portalUrl]);

  const loadNotifications = React.useCallback(async () => {
    setIsNotificationsLoading(true);
    setNotificationError(null);

    try {
      const nextNotifications = await notificationsApi.list(employeeId);
      setNotifications(nextNotifications);
    } catch {
      setNotificationError('Не удалось загрузить уведомления');
    } finally {
      setIsNotificationsLoading(false);
    }
  }, [employeeId]);

  React.useEffect(() => {
    if (!canUseNotificationCenter && initialRoute === 'notifications') {
      setRoute('root');
      return;
    }
    setRoute(initialRoute);
  }, [canUseNotificationCenter, initialRoute]);

  React.useEffect(() => {
    if (!canUseNotificationCenter) {
      return;
    }

    if (route !== 'root' && route !== 'notifications') {
      return;
    }

    void loadNotifications();
  }, [canUseNotificationCenter, loadNotifications, route]);

  React.useEffect(() => {
    if (canUseNotificationCenter) {
      return;
    }
    if (route === 'notifications') {
      setRoute('root');
    }
  }, [canUseNotificationCenter, route]);

  React.useEffect(() => {
    if (route !== 'household-order') {
      return;
    }

    let cancelled = false;
    const loadShops = async () => {
      setIsHouseholdShopsLoading(true);
      setHouseholdShopsError(null);

      try {
        const shops = await shiftApi.getRegionShops(employeeId);
        if (cancelled) {
          return;
        }
        setHouseholdShops(shops);
        setHouseholdSelectedShopId(current => {
          if (current && shops.some(shop => shop.id === current)) {
            return current;
          }
          return shops[0]?.id ?? null;
        });
      } catch {
        if (!cancelled) {
          setHouseholdShops([]);
          setHouseholdSelectedShopId(null);
          setHouseholdShopsError('Не удалось загрузить список магазинов региона');
        }
      } finally {
        if (!cancelled) {
          setIsHouseholdShopsLoading(false);
        }
      }
    };

    void loadShops();

    return () => {
      cancelled = true;
    };
  }, [employeeId, route]);

  React.useEffect(() => {
    if (route !== 'household-order') {
      return;
    }

    let cancelled = false;
    const probeApi = async () => {
      setExchangeApiStatus('checking');
      try {
        const status = await householdApi.probeExchange(employeeId);
        if (!cancelled) {
          setExchangeApiStatus(status);
        }
      } catch {
        if (!cancelled) {
          setExchangeApiStatus('disconnected');
        }
      }
    };

    void probeApi();

    return () => {
      cancelled = true;
    };
  }, [employeeId, route]);

  React.useEffect(() => {
    if (route !== 'household-order') {
      return;
    }

    let cancelled = false;
    const loadCatalog = async () => {
      setIsHouseholdCatalogLoading(true);
      setHouseholdCatalogError(null);

      try {
        const items = await householdApi.getCatalog(employeeId);
        if (cancelled) {
          return;
        }
        setHouseholdCatalogItems(items);
      } catch {
        if (!cancelled) {
          setHouseholdCatalogItems([]);
          setHouseholdCatalogError('Не удалось загрузить список хозтоваров');
        }
      } finally {
        if (!cancelled) {
          setIsHouseholdCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [employeeId, route]);

  React.useEffect(() => {
    if (route !== 'household-order') {
      return;
    }

    let cancelled = false;
    const probeApi = async () => {
      setHouseholdApiStatus('checking');
      try {
        const status = await householdApi.probe(employeeId);
        if (!cancelled) {
          setHouseholdApiStatus(status);
        }
      } catch {
        if (!cancelled) {
          setHouseholdApiStatus('disconnected');
        }
      }
    };

    void probeApi();

    return () => {
      cancelled = true;
    };
  }, [employeeId, route]);

  const handleNotificationPress = React.useCallback(
    async (notification: NotificationItem) => {
      if (!canUseNotificationCenter) {
        return;
      }
      if (notification.is_read) {
        return;
      }

      setActiveNotificationId(notification.id);

      try {
        await notificationsApi.markRead(employeeId, notification.id);
        setNotifications(prev =>
          prev.map(item =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                  read_at: item.read_at || new Date().toISOString(),
                }
              : item,
          ),
        );
      } catch {
        setNotificationError('Не удалось отметить уведомление как прочитанное');
      } finally {
        setActiveNotificationId(null);
      }
    },
    [canUseNotificationCenter, employeeId],
  );

  const handleMarkAllRead = React.useCallback(async () => {
    if (!canUseNotificationCenter) {
      return;
    }
    if (!unreadNotificationsCount) {
      return;
    }

    setIsMarkAllReadLoading(true);
    setNotificationError(null);

    try {
      await notificationsApi.markAllRead(employeeId);
      const now = new Date().toISOString();
      setNotifications(prev =>
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
    } catch {
      setNotificationError('Не удалось отметить уведомления как прочитанные');
    } finally {
      setIsMarkAllReadLoading(false);
    }
  }, [canUseNotificationCenter, employeeId, unreadNotificationsCount]);

  React.useEffect(() => {
    if (!isAndroid || route === 'root') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setRoute('root');
        return true;
      },
    );

    return () => subscription.remove();
  }, [isAndroid, route]);

  React.useEffect(() => {
    return () => {
      holdTimersRef.current.forEach(timer => clearTimeout(timer));
      holdTimersRef.current = [];
    };
  }, []);

  const stopThemeHold = React.useCallback(
    (animated = true) => {
      holdTimersRef.current.forEach(timer => clearTimeout(timer));
      holdTimersRef.current = [];

      const finish = () => {
        setHoldTarget(null);
        holdCommittedRef.current = false;
      };

      if (animated) {
        Animated.timing(androidTheme.previewProgress, {
          toValue: 0,
          duration: 360,
          easing: Easing.bezier(0.24, 0.86, 0.24, 1),
          useNativeDriver: true,
        }).start(() => {
          androidTheme.clearPreview();
          finish();
        });
      } else {
        androidTheme.clearPreview();
        finish();
      }
    },
    [androidTheme],
  );

  const startThemeHold = React.useCallback(
    (mode: 'company' | 'material') => {
      if (!isAndroid || androidTheme.transitionPhase !== 'idle') {
        return;
      }

      holdCommittedRef.current = false;
      setHoldTarget(mode);
      androidRustleHaptic();
      holdTimersRef.current = [];

      Animated.timing(androidTheme.previewProgress, {
        toValue: 1,
        duration: 1280,
        easing: Easing.bezier(0.2, 0.92, 0.24, 1),
        useNativeDriver: true,
      }).start();
    },
    [androidTheme, isAndroid],
  );

  const commitThemeHold = React.useCallback(
    (mode: 'company' | 'material') => {
      if (
        !isAndroid ||
        holdCommittedRef.current ||
        androidTheme.mode === mode
      ) {
        stopThemeHold();
        return;
      }

      holdCommittedRef.current = true;
      holdTimersRef.current.forEach(timer => clearTimeout(timer));
      holdTimersRef.current = [];
      androidPeakImpact();

      Animated.timing(androidTheme.previewProgress, {
        toValue: 1,
        duration: 240,
        easing: Easing.bezier(0.18, 0.9, 0.22, 1),
        useNativeDriver: true,
      }).start(() => {
        androidTheme.setMode(mode);
        setTimeout(() => {
          stopThemeHold();
        }, 420);
      });
    },
    [androidTheme, isAndroid, stopThemeHold],
  );

  const handleThemeCardLayout = React.useCallback(
    (mode: 'company' | 'material', event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setHoldLayout(current => {
        const prev = current[mode];
        if (
          Math.abs(prev.width - width) < 1 &&
          Math.abs(prev.height - height) < 1
        ) {
          return current;
        }
        return {
          ...current,
          [mode]: { width, height },
        };
      });
    },
    [],
  );

  const handleThemePressIn = React.useCallback(
    (mode: 'company' | 'material', event: GestureResponderEvent) => {
      const { locationX, locationY, pageX, pageY } = event.nativeEvent;
      stopThemeHold(false);
      setHoldOrigin(current => ({
        ...current,
        [mode]: { x: locationX, y: locationY },
      }));
      androidTheme.beginPreview(mode, { x: pageX, y: pageY });
      startThemeHold(mode);
    },
    [androidTheme, startThemeHold, stopThemeHold],
  );

  const renderThemeHoldOverlay = (
    mode: 'company' | 'material',
    accent: ColorValue,
  ) => {
    if (holdTarget !== mode) {
      return null;
    }

    const layout = holdLayout[mode];
    const origin = holdOrigin[mode];
    const maxRadius = Math.max(
      Math.hypot(origin.x, origin.y),
      Math.hypot(layout.width - origin.x, origin.y),
      Math.hypot(origin.x, layout.height - origin.y),
      Math.hypot(layout.width - origin.x, layout.height - origin.y),
      1,
    );
    const circleSize = maxRadius * 2;
    const fillOpacity = [0.18, 0.46];
    const circleOpacity = [0.12, 0.5];
    const strokeOpacity = [0.34, 0.98];

    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.optionHoldFill,
            {
              backgroundColor: accent,
              opacity: androidTheme.previewProgress.interpolate({
                inputRange: [0, 1],
                outputRange: fillOpacity,
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.optionHoldCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: maxRadius,
              left: origin.x - maxRadius,
              top: origin.y - maxRadius,
              backgroundColor: accent,
              opacity: androidTheme.previewProgress.interpolate({
                inputRange: [0, 1],
                outputRange: circleOpacity,
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: androidTheme.previewProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.02, 1.14],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.optionHoldStroke,
            {
              borderColor: accent,
              opacity: androidTheme.previewProgress.interpolate({
                inputRange: [0, 1],
                outputRange: strokeOpacity,
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </>
    );
  };

  const handlePortalPrimaryAction = React.useCallback(() => {
    if (portalSession.status === 'active') {
      logoutPortal();
      return;
    }

    if (portalSession.status === 'pending_confirm') {
      confirmPortal();
      return;
    }

    loginPortal();
  }, [confirmPortal, loginPortal, logoutPortal, portalSession.status]);

  const handleSubmitBlackBox = React.useCallback(async () => {
    const text = blackBoxMessage.trim();
    if (!text) {
      setBlackBoxError('Сообщение не может быть пустым');
      setBlackBoxSuccess(null);
      return;
    }

    setIsBlackBoxSubmitting(true);
    setBlackBoxError(null);
    setBlackBoxSuccess(null);
    androidRustleHaptic();

    try {
      await blackBoxApi.report(employeeId, { message: text });
      setBlackBoxMessage('');
      setBlackBoxSuccess(
        'Гарантируем конфиденциальность вашего обращения. Сообщение отправлено.',
      );
      androidPeakImpact();
    } catch (error) {
      setBlackBoxError(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить сообщение в чёрный ящик',
      );
    } finally {
      setIsBlackBoxSubmitting(false);
    }
  }, [blackBoxMessage, employeeId]);

  const handleSubmitIdea = React.useCallback(async () => {
    const text = ideaMessage.trim();
    if (!text) {
      setIdeaError('Опишите идею перед отправкой');
      setIdeaSuccess(null);
      return;
    }

    setIsIdeaSubmitting(true);
    setIdeaError(null);
    setIdeaSuccess(null);
    androidRustleHaptic();

    try {
      await ideaApi.report(employeeId, { message: text });
      setIdeaMessage('');
      setIdeaSuccess('Идея отправлена руководству на модерацию.');
      androidPeakImpact();
    } catch (error) {
      setIdeaError(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить идею',
      );
    } finally {
      setIsIdeaSubmitting(false);
    }
  }, [employeeId, ideaMessage]);

  const upsertHouseholdItem = React.useCallback(
    (catalogItem: HouseholdCatalogItem, quantityDelta = 1) => {
      if (!catalogItem.id || !catalogItem.name.trim()) {
        return;
      }

      setHouseholdItems(prev => {
        const existing = prev.find(item => item.catalogId === catalogItem.id);
        if (!existing) {
          return [
            ...prev,
            {
              id: `${catalogItem.id}`,
              catalogId: catalogItem.id,
              name: catalogItem.name.trim(),
              quantity: Math.max(1, quantityDelta),
            },
          ];
        }

        return prev.map(item =>
          item.id === existing.id
            ? {
                ...item,
                quantity: Math.max(1, item.quantity + quantityDelta),
              }
            : item,
        );
      });
      setHouseholdError(null);
      setHouseholdSuccess(null);
      androidRustleHaptic();
    },
    [],
  );

  const setHouseholdItemQuantity = React.useCallback(
    (id: string, value: number) => {
      setHouseholdItems(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                quantity: Math.max(1, Math.min(999, value)),
              }
            : item,
        ),
      );
      setHouseholdError(null);
      setHouseholdSuccess(null);
    },
    [],
  );

  const removeHouseholdItem = React.useCallback((id: string) => {
    setHouseholdItems(prev => prev.filter(item => item.id !== id));
    setHouseholdError(null);
    setHouseholdSuccess(null);
    androidRustleHaptic();
  }, []);

  const householdPayload = React.useMemo<HouseholdOrderPreview>(
    () => ({
      employee_id: Number.isInteger(Number(employeeId)) ? Number(employeeId) : null,
      shop_name:
        householdShops.find(shop => shop.id === householdSelectedShopId)?.name ?? '',
      priority: householdPriority,
      comment: householdComment.trim(),
      items: householdItems.map(item => ({
        id: item.catalogId,
        name: item.name,
        quantity: item.quantity,
      })),
      source: 'mobile_app',
    }),
    [employeeId, householdComment, householdItems, householdPriority, householdSelectedShopId, householdShops],
  );

  const householdSubmitPayload = React.useMemo<HouseholdOrderPayload>(
    () => ({
      shop_name: householdPayload.shop_name,
      priority: householdPayload.priority,
      comment: householdPayload.comment,
      items: householdPayload.items,
      source: 'mobile_app',
    }),
    [householdPayload],
  );

  const exchangeSubmitPayload = React.useMemo<ExchangeOrderPayload>(
    () => ({
      shop_name:
        householdShops.find(shop => shop.id === householdSelectedShopId)?.name ?? '',
      urgency: householdPriority === 'urgent' ? 'Надо срочно' : 'Терпимо 2 дня',
      priority: householdPriority,
      amount: Number(exchangeAmount.replace(',', '.')),
      comment: exchangeComment.trim(),
      source: 'mobile_app',
    }),
    [
      exchangeAmount,
      exchangeComment,
      householdPriority,
      householdSelectedShopId,
      householdShops,
    ],
  );

  const filteredHouseholdCatalog = React.useMemo(() => {
    const query = householdCatalogQuery.trim().toLowerCase();
    if (!query) {
      return householdCatalogItems;
    }

    return householdCatalogItems.filter(item =>
      item.name.toLowerCase().includes(query),
    );
  }, [householdCatalogItems, householdCatalogQuery]);

  React.useEffect(() => {
    setHouseholdCatalogVisibleCount(HOUSEHOLD_CATALOG_PAGE_SIZE);
  }, [householdCatalogQuery, householdCatalogItems.length]);

  const visibleHouseholdCatalog = React.useMemo(
    () => filteredHouseholdCatalog.slice(0, householdCatalogVisibleCount),
    [filteredHouseholdCatalog, householdCatalogVisibleCount],
  );

  const hasMoreHouseholdCatalog =
    filteredHouseholdCatalog.length > visibleHouseholdCatalog.length;
  const canCollapseHouseholdCatalog =
    visibleHouseholdCatalog.length > HOUSEHOLD_CATALOG_PAGE_SIZE &&
    filteredHouseholdCatalog.length > HOUSEHOLD_CATALOG_PAGE_SIZE;

  const householdTotalUnits = React.useMemo(
    () => householdItems.reduce((sum, item) => sum + item.quantity, 0),
    [householdItems],
  );

  const handleHouseholdSubmit = React.useCallback(async () => {
    const hasShop = householdPayload.shop_name.length > 0;
    if (!hasShop) {
      setHouseholdError('Выберите магазин из списка региона');
      setHouseholdSuccess(null);
      return;
    }
    if (householdPayload.items.length === 0) {
      setHouseholdError('Добавьте хотя бы одну позицию');
      setHouseholdSuccess(null);
      return;
    }

    if (householdApiStatus !== 'connected') {
      setHouseholdError('API хозтоваров не подключено на сервере');
      setHouseholdSuccess(null);
      return;
    }

    setHouseholdError(null);
    setHouseholdSuccess(null);
    setIsHouseholdSubmitting(true);

    try {
      const result = await householdApi.submit(employeeId, householdSubmitPayload);
      setHouseholdSuccess(
        result.id
          ? `Заявка отправлена. Номер: ${result.id}`
          : 'Заявка отправлена',
      );
      setHouseholdComment('');
      setHouseholdItems([]);
      androidPeakImpact();
    } catch (error) {
      setHouseholdError(
        error instanceof Error ? error.message : 'Не удалось отправить заявку',
      );
      setHouseholdSuccess(null);
    } finally {
      setIsHouseholdSubmitting(false);
    }
  }, [employeeId, householdApiStatus, householdPayload, householdSubmitPayload]);

  const handleExchangeSubmit = React.useCallback(async () => {
    const parsedAmount = Number(exchangeAmount.replace(',', '.'));

    if (!exchangeSubmitPayload.shop_name) {
      setHouseholdError('Выберите магазин из списка региона');
      setHouseholdSuccess(null);
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setHouseholdError('Введите корректную сумму размена');
      setHouseholdSuccess(null);
      return;
    }

    if (exchangeApiStatus !== 'connected') {
      setHouseholdError('API заказа размена не подключено на сервере');
      setHouseholdSuccess(null);
      return;
    }

    setHouseholdError(null);
    setHouseholdSuccess(null);
    setIsHouseholdSubmitting(true);

    try {
      const result = await householdApi.submitExchange(employeeId, exchangeSubmitPayload);
      setHouseholdSuccess(
        result.id
          ? `Заявка на размен отправлена. Номер: ${result.id}`
          : 'Заявка на размен отправлена',
      );
      setExchangeAmount('');
      setExchangeComment('');
      androidPeakImpact();
    } catch (error) {
      setHouseholdError(
        error instanceof Error ? error.message : 'Не удалось отправить заявку на размен',
      );
      setHouseholdSuccess(null);
    } finally {
      setIsHouseholdSubmitting(false);
    }
  }, [employeeId, exchangeAmount, exchangeApiStatus, exchangeSubmitPayload]);

  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        {route !== 'root' ? (
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: isCompanyMode
                  ? palette.surfaceMuted
                  : palette.surfaceRaised,
                borderColor: backButtonBorderColor,
              },
            ]}
            onPress={() => setRoute('root')}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            {Platform.OS === 'ios' ? (
              <Text
                style={[styles.backButtonText, { color: palette.onSurface }]}
              >
                ‹
              </Text>
            ) : (
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Path
                  d="M10.5 2.5 L5 8 L10.5 13.5"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerTextWrap}>
          <Text style={[styles.screenTitle, { color: palette.onSurface }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: palette.onSurfaceMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderRoot = () => (
    <>
      <AnimatedEntranceView
        delay={30}
        style={[
          styles.sectionCard,
          styles.heroCard,
          {
            backgroundColor: heroCardBackground,
            borderColor: isCompanyMode
              ? palette.primaryContainerStrong
              : palette.outlineVariant,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isCompanyMode ? 0.18 : 0.08,
            shadowRadius: 24,
            elevation: isCompanyMode ? 8 : 4,
          },
        ]}
      >
        <View
          style={[
            styles.heroAccentBar,
            {
              backgroundColor: isCompanyMode
                ? palette.primary
                : materialSolidAccent,
            },
          ]}
        />
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Центр настроек
        </Text>
        <Text style={[styles.subtitle, { color: secondaryMutedColor }]}>
          {rootMenuTab === 'appearance'
            ? 'Оформление и персонализация.'
            : 'Рабочие сервисы и инструменты.'}
        </Text>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={110}
        style={[
          styles.sectionCard,
          styles.rootLinksCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: isCompanyMode
              ? palette.outlineVariant
              : palette.outlineVariant,
          },
        ]}
      >
        <View style={styles.rootMenuSwitch}>
          <Pressable
            style={[
              styles.rootMenuTab,
              {
                backgroundColor:
                  rootMenuTab === 'appearance' ? accentSurface : palette.surface,
                borderColor:
                  rootMenuTab === 'appearance'
                    ? isCompanyMode
                      ? palette.primaryStrong
                      : palette.primary
                    : palette.outlineVariant,
              },
            ]}
            onPress={() => setRootMenuTab('appearance')}>
            <Text
              style={[
                styles.rootMenuTabText,
                {
                  color:
                    rootMenuTab === 'appearance'
                      ? accentTextColor
                      : secondaryMutedColor,
                },
              ]}>
              Оформление и персонализация
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.rootMenuTab,
              {
                backgroundColor:
                  rootMenuTab === 'tools' ? accentSurface : palette.surface,
                borderColor:
                  rootMenuTab === 'tools'
                    ? isCompanyMode
                      ? palette.primaryStrong
                      : palette.primary
                    : palette.outlineVariant,
              },
            ]}
            onPress={() => setRootMenuTab('tools')}>
            <Text
              style={[
                styles.rootMenuTabText,
                {
                  color:
                    rootMenuTab === 'tools' ? accentTextColor : secondaryMutedColor,
                },
              ]}>
              Инструменты
            </Text>
          </Pressable>
        </View>

        <View style={styles.appearanceOptionList}>
          {rootMenuTab === 'appearance' ? (
            <Pressable
              style={[
                styles.navRow,
                styles.navRowCompact,
                {
                  backgroundColor: palette.surface,
                  borderColor: isCompanyMode
                    ? palette.primaryContainerStrong
                    : palette.outlineVariant,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isCompanyMode ? 0.12 : 0.04,
                  shadowRadius: 18,
                  elevation: isCompanyMode ? 4 : 2,
                },
              ]}
              onPress={() => setRoute('appearance')}>
              <View
                style={[
                  styles.navRowBadge,
                  {
                    backgroundColor: accentSurface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                  },
                ]}>
                <MoreNavIcon kind="appearance" color={accentTextColor} />
              </View>
              <View style={styles.navRowTextWrap}>
                <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                  Оформление
                </Text>
                <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                  Стиль приложения
                </Text>
                <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
                  {isAndroid
                    ? 'Фирменный стиль Dr.Smoke и Material You.'
                    : 'Настройки оформления приложения.'}
                </Text>
              </View>
              <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
            </Pressable>
          ) : null}

          {rootMenuTab === 'appearance' && isAndroid ? (
            <Pressable
              style={[
                styles.navRow,
                styles.navRowCompact,
                {
                  backgroundColor: palette.surface,
                  borderColor: isCompanyMode
                    ? palette.primaryContainerStrong
                    : palette.outlineVariant,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isCompanyMode ? 0.12 : 0.04,
                  shadowRadius: 18,
                  elevation: isCompanyMode ? 4 : 2,
                },
              ]}
              onPress={() => setRoute('preferences')}>
              <View
                style={[
                  styles.navRowBadge,
                  {
                    backgroundColor: accentSurface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                  },
                ]}>
                <MoreNavIcon kind="preferences" color={accentTextColor} />
              </View>
              <View style={styles.navRowTextWrap}>
                <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                  Персонализация
                </Text>
                <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                  Анимация и отклик
                </Text>
                <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
                  Анимации, отклик и контраст.
                </Text>
              </View>
              <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
            </Pressable>
          ) : null}

          {rootMenuTab === 'tools' ? (
            <>
              <Pressable
                style={[
                  styles.navRow,
                  styles.navRowCompact,
                  {
                    backgroundColor: palette.surface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                  },
                ]}
                onPress={() => setRoute('portal')}>
                <View
                  style={[
                    styles.navRowBadge,
                    {
                      backgroundColor: accentSurface,
                      borderColor: isCompanyMode
                        ? palette.primaryContainerStrong
                        : palette.outlineVariant,
                    },
                  ]}>
                  <MoreNavIcon kind="portal" color={accentTextColor} />
                </View>
                <View style={styles.navRowTextWrap}>
                  <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                    Инструменты
                  </Text>
                  <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                    Доступ на портал
                  </Text>
                  <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
                    Быстрый вход в портал сотрудника.
                  </Text>
                </View>
                <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.navRow,
                  styles.navRowCompact,
                  {
                    backgroundColor: palette.surface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                  },
                ]}
                onPress={() => setRoute('idea')}>
                <View
                  style={[
                    styles.navRowBadge,
                    {
                      backgroundColor: accentSurface,
                      borderColor: isCompanyMode
                        ? palette.primaryContainerStrong
                        : palette.outlineVariant,
                    },
                  ]}>
                  <MoreNavIcon kind="idea" color={accentTextColor} />
                </View>
                <View style={styles.navRowTextWrap}>
                  <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                    Инструменты
                  </Text>
                  <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                    У меня есть идея
                  </Text>
                  <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
                    Отправка инициативы руководству.
                  </Text>
                </View>
                <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.navRow,
                  styles.navRowCompact,
                  {
                    backgroundColor: palette.surface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                  },
                ]}
                onPress={() => setRoute('black-box')}>
                <View
                  style={[
                    styles.navRowBadge,
                    {
                      backgroundColor: accentSurface,
                      borderColor: isCompanyMode
                        ? palette.primaryContainerStrong
                        : palette.outlineVariant,
                    },
                  ]}>
                  <MoreNavIcon kind="black-box" color={accentTextColor} />
                </View>
                <View style={styles.navRowTextWrap}>
                  <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                    Инструменты
                  </Text>
                  <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                    Чёрный ящик
                  </Text>
                  <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
                    Конфиденциальное сообщение руководству.
                  </Text>
                </View>
                <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.navRow,
                  styles.navRowCompact,
                  {
                    backgroundColor: palette.surface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                  },
                ]}
                onPress={() => setRoute('household-order')}>
                <View
                  style={[
                    styles.navRowBadge,
                    {
                      backgroundColor: accentSurface,
                      borderColor: isCompanyMode
                        ? palette.primaryContainerStrong
                        : palette.outlineVariant,
                    },
                  ]}>
                  <MoreNavIcon kind="household" color={accentTextColor} />
                </View>
                <View style={styles.navRowTextWrap}>
                  <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                    Инструменты
                  </Text>
                  <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                    Заказ хозтоваров
                  </Text>
                  <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
                    Заявка: позиции, количество, комментарий.
                  </Text>
                </View>
                <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
              </Pressable>

              {canUseNotificationCenter ? (
                <Pressable
                  style={[
                    styles.navRow,
                    styles.navRowCompact,
                    {
                      backgroundColor: palette.surface,
                      borderColor: isCompanyMode
                        ? palette.primaryContainerStrong
                        : palette.outlineVariant,
                    },
                  ]}
                  onPress={() => setRoute('notifications')}>
                  <View
                    style={[
                      styles.navRowBadge,
                      {
                        backgroundColor: accentSurface,
                        borderColor: isCompanyMode
                          ? palette.primaryContainerStrong
                          : palette.outlineVariant,
                      },
                    ]}>
                    <MoreNavIcon kind="notifications" color={accentTextColor} />
                  </View>
                  <View style={styles.navRowTextWrap}>
                    <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                      Сервис
                    </Text>
                    <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                      Уведомления
                    </Text>
                    <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
                      Лента событий и статусы операций.
                    </Text>
                  </View>
                  <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={180}
        style={[
          styles.sectionCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: isCompanyMode
              ? palette.outlineVariant
              : palette.outlineVariant,
          },
        ]}
      >
        <View style={styles.guideHeader}>
          <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
            Путеводитель
          </Text>
          <Text style={[styles.guideTitle, { color: palette.onSurface }]}>
            Как пользоваться приложением
          </Text>
          <Text style={[styles.guideSubtitle, { color: secondaryMutedColor }]}>
            Выберите раздел и посмотрите короткий туториал по шагам.
          </Text>
        </View>

        <View style={styles.guideTopicGrid}>
          {GUIDE_TOPICS.map(topic => {
            const isActive = topic.key === activeGuideTopic;
            return (
              <Pressable
                key={topic.key}
                style={[
                  styles.guideTopicChip,
                  {
                    backgroundColor: isActive ? accentSurface : palette.surface,
                    borderColor: isActive
                      ? isCompanyMode
                        ? palette.primaryStrong
                        : palette.primary
                      : isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                  },
                ]}
                onPress={() => setActiveGuideTopic(topic.key)}
              >
                <Text
                  style={[
                    styles.guideTopicChipText,
                    {
                      color: isActive ? accentTextColor : palette.onSurfaceMuted,
                    },
                  ]}
                >
                  {topic.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {(() => {
          const topic =
            GUIDE_TOPICS.find(item => item.key === activeGuideTopic) ??
            GUIDE_TOPICS[0];
          return (
            <View
              style={[
                styles.guideBodyCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: isCompanyMode
                    ? palette.primaryContainerStrong
                    : palette.outlineVariant,
                },
              ]}
            >
              <Text style={[styles.guideBodyTitle, { color: palette.onSurface }]}>
                {topic.title}
              </Text>
              <Text
                style={[styles.guideBodySubtitle, { color: secondaryMutedColor }]}
              >
                {topic.subtitle}
              </Text>
              <View style={styles.guideSteps}>
                {topic.steps.map((step, index) => (
                  <View key={`${topic.key}-${index}`} style={styles.guideStepRow}>
                    <Text
                      style={[
                        styles.guideStepIndex,
                        { color: isCompanyMode ? palette.primaryStrong : palette.primary },
                      ]}
                    >
                      {index + 1}.
                    </Text>
                    <Text
                      style={[
                        styles.guideStepText,
                        { color: palette.onSurfaceMuted },
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
      </AnimatedEntranceView>
    </>
  );

  const renderNotifications = () => (
    <>
      <View
        style={[
          styles.heroGlowCard,
          {
            backgroundColor: heroCardBackground,
            borderColor: heroBorderColor,
          },
        ]}
      >
        <View
          style={[
            styles.heroAccentBar,
            {
              backgroundColor: isCompanyMode
                ? String(palette.primary)
                : materialSolidAccent,
            },
          ]}
        />
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Super HR
        </Text>
        <Text style={[styles.heroTitle, { color: String(palette.onSurface) }]}>
          Центр уведомлений
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          Здесь собираются события по открытиям смен. Нажатие на карточку
          отмечает уведомление как прочитанное.
        </Text>

        <View style={styles.portalStatRow}>
          <View
            style={[
              styles.portalStatCard,
              {
                backgroundColor: String(palette.surfaceRaised),
                borderColor: String(palette.outlineVariant),
              },
            ]}
          >
            <Text style={[styles.portalStatLabel, { color: heroKickerColor }]}>
              Непрочитано
            </Text>
            <Text
              style={[
                styles.portalStatValue,
                { color: String(palette.onSurface) },
              ]}
            >
              {unreadNotificationsCount}
            </Text>
          </View>
          <View
            style={[
              styles.portalStatCard,
              {
                backgroundColor: String(palette.surfaceRaised),
                borderColor: String(palette.outlineVariant),
              },
            ]}
          >
            <Text style={[styles.portalStatLabel, { color: heroKickerColor }]}>
              Всего
            </Text>
            <Text
              style={[
                styles.portalStatValue,
                { color: String(palette.onSurface) },
              ]}
            >
              {notifications.length}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: String(palette.surfaceRaised),
            borderColor: String(palette.outlineVariant),
          },
        ]}
      >
        <View style={styles.notificationsToolbar}>
          <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
            Лента
          </Text>
          <TouchableOpacity
            style={[
              styles.inlineActionButton,
              styles.notificationsToolbarButton,
              {
                backgroundColor: String(palette.surface),
                borderColor: String(palette.outlineVariant),
              },
            ]}
            onPress={handleMarkAllRead}
            disabled={isMarkAllReadLoading || unreadNotificationsCount === 0}
          >
            <Text
              style={[
                styles.inlineActionText,
                { color: String(palette.onSurface) },
              ]}
            >
              {isMarkAllReadLoading ? 'Отмечаем…' : 'Прочитать все'}
            </Text>
          </TouchableOpacity>
        </View>

        {notificationError ? (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: String(palette.errorContainer),
                borderColor: String(palette.errorBorder),
              },
            ]}
          >
            <Text style={[styles.noticeText, { color: String(palette.error) }]}>
              {notificationError}
            </Text>
          </View>
        ) : null}

        {isNotificationsLoading ? (
          <View style={styles.notificationsLoadingWrap}>
            <ActivityIndicator size="small" color={accentTextColor} />
          </View>
        ) : notifications.length === 0 ? (
          <View
            style={[
              styles.emptyStateCard,
              {
                backgroundColor: String(palette.surface),
                borderColor: String(palette.outlineVariant),
              },
            ]}
          >
            <Text
              style={[styles.optionTitle, { color: String(palette.onSurface) }]}
            >
              Пока пусто
            </Text>
            <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
              Когда сотрудники начнут открывать смены, уведомления появятся в
              этом списке.
            </Text>
          </View>
        ) : (
          <View style={styles.rowList}>
            {notifications.map(notification => {
              const isUnread = !notification.is_read;
              const isBusy = activeNotificationId === notification.id;

              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    {
                      backgroundColor: isUnread
                        ? String(palette.surface)
                        : String(palette.surfaceMuted),
                      borderColor: isUnread
                        ? isCompanyMode
                          ? String(palette.primaryContainerStrong)
                          : String(palette.outlineVariant)
                        : String(palette.outlineVariant),
                    },
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  disabled={isBusy}
                >
                  <View style={styles.notificationHeaderRow}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        { color: String(palette.onSurface) },
                      ]}
                    >
                      {notification.title || 'Уведомление'}
                    </Text>
                    {isBusy ? (
                      <ActivityIndicator size="small" color={accentTextColor} />
                    ) : (
                      <View
                        style={[
                          styles.notificationStateBadge,
                          {
                            backgroundColor: isUnread
                              ? isCompanyMode
                                ? String(palette.primary)
                                : materialSolidAccent
                              : String(palette.surfaceAccent),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.notificationStateBadgeText,
                            {
                              color: isUnread
                                ? '#FFFFFF'
                                : String(palette.onSurfaceMuted),
                            },
                          ]}
                        >
                          {isUnread ? 'Новое' : 'Прочитано'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.notificationBody,
                      {
                        color: isUnread
                          ? String(palette.onSurface)
                          : secondaryMutedColor,
                      },
                    ]}
                  >
                    {notification.body || 'Текст уведомления пока не добавлен'}
                  </Text>
                  <Text
                    style={[
                      styles.notificationMeta,
                      { color: secondaryMutedColor },
                    ]}
                  >
                    {formatNotificationTimestamp(notification)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.secondaryButton,
          {
            backgroundColor: String(palette.surface),
            borderColor: String(palette.outlineVariant),
          },
        ]}
        onPress={() => setRoute('root')}
      >
        <Text
          style={[
            styles.secondaryButtonText,
            { color: String(palette.onSurface) },
          ]}
        >
          Назад в настройки
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderAppearance = () => (
    <AnimatedEntranceView
      delay={40}
      style={[
        styles.sectionCard,
        styles.appearanceSectionCard,
        {
          backgroundColor: palette.surfaceRaised,
          borderColor: palette.outlineVariant,
        },
      ]}
    >
      {!isAndroid ? (
        <>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: palette.primaryContainer },
            ]}
          >
            <Text
              style={[styles.statusPillText, { color: palette.primaryStrong }]}
            >
              iOS
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: palette.onSurface }]}>
            Оформление приложения
          </Text>
          <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
            На iPhone приложение опирается на нативный iOS-стиль. Отдельное
            переключение тем используется только на Android.
          </Text>
        </>
      ) : (
        <View style={styles.rowList}>
          <View style={styles.appearanceIntro}>
            <View
              style={[
                styles.appearanceIntroBar,
                {
                  backgroundColor: isCompanyMode
                    ? companyCardAccent
                    : materialCardAccent,
                },
              ]}
            />
            <Text
              style={[styles.appearanceIntroKicker, { color: accentTextColor }]}
            >
              Android Themes
            </Text>
            <Text
              style={[
                styles.appearanceIntroText,
                { color: secondaryMutedColor },
              ]}
            >
              Выбери фирменный стиль или системную тему. Удержание карточки
              запускает переключение и применяет оформление ко всему приложению.
            </Text>
          </View>

          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: companyCardBackground,
                borderColor: companyCardBorderColor,
                shadowColor: isCompanyMode ? activeCardShadowColor : '#000000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isCompanyMode ? activeCardShadowOpacity : 0.03,
                shadowRadius: isCompanyMode ? activeCardShadowRadius : 14,
                elevation: isCompanyMode ? activeCardElevation : 2,
              },
            ]}
            delayLongPress={620}
            onLayout={event => handleThemeCardLayout('company', event)}
            onPressIn={event => handleThemePressIn('company', event)}
            onPressOut={() => stopThemeHold()}
            onLongPress={() => commitThemeHold('company')}
          >
            {renderThemeHoldOverlay('company', COMPANY_THEME_ACCENT)}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeLeft,
                  {
                    backgroundColor: companyBadgeBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeLeftText,
                    {
                      color: companyBadgeTextColor,
                    },
                  ]}
                >
                  Фирменный
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: companyRadioBorderColor,
                    backgroundColor: isCompanyMode
                      ? companyCardAccent
                      : 'transparent',
                  },
                ]}
              >
                {isCompanyMode ? (
                  <View
                    style={[styles.radioInner, { backgroundColor: '#FFFFFF' }]}
                  />
                ) : null}
              </View>
            </View>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionTitle, { color: palette.onSurface }]}>
                Код компании
              </Text>
              <Text style={[styles.optionMeta, { color: companyCardAccent }]}>
                Темный режим
              </Text>
            </View>
            <View style={styles.previewRail}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: COMPANY_PREVIEW_COLORS[0],
                    borderColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewDot,
                    { backgroundColor: COMPANY_THEME_ACCENT },
                  ]}
                />
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: 'rgba(255,255,255,0.18)' },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.previewTall,
                  { backgroundColor: COMPANY_THEME_ACCENT },
                ]}
              />
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: COMPANY_PREVIEW_COLORS[2],
                    borderColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: 'rgba(255,255,255,0.9)' },
                  ]}
                />
                <View
                  style={[
                    styles.previewLineShort,
                    { backgroundColor: 'rgba(255,255,255,0.22)' },
                  ]}
                />
              </View>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: materialCardBackground,
                borderColor: materialCardBorderColor,
                shadowColor: isMaterialMode ? activeCardShadowColor : '#000000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: isMaterialMode ? activeCardShadowOpacity : 0.03,
                shadowRadius: isMaterialMode ? activeCardShadowRadius : 14,
                elevation: isMaterialMode ? activeCardElevation : 2,
              },
            ]}
            delayLongPress={620}
            onLayout={event => handleThemeCardLayout('material', event)}
            onPressIn={event => handleThemePressIn('material', event)}
            onPressOut={() => stopThemeHold()}
            onLongPress={() => commitThemeHold('material')}
          >
            {renderThemeHoldOverlay('material', materialSolidAccent)}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeLeft,
                  {
                    backgroundColor: materialBadgePillBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeLeftText,
                    {
                      color: materialBadgePillTextColor,
                    },
                  ]}
                >
                  Системная
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: materialRadioBorderColor,
                    backgroundColor: isMaterialMode
                      ? materialCardAccent
                      : 'transparent',
                  },
                ]}
              >
                {isMaterialMode ? (
                  <View
                    style={[styles.radioInner, { backgroundColor: '#FFFFFF' }]}
                  />
                ) : null}
              </View>
            </View>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionTitle, { color: palette.onSurface }]}>
                Material You
              </Text>
              <Text
                style={[
                  styles.optionMeta,
                  {
                    color: isMaterialMode
                      ? materialCardAccent
                      : secondaryMutedColor,
                  },
                ]}
              >
                Системная тема
              </Text>
            </View>
            <View style={styles.previewRail}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: materialPreviewCardBackground,
                    borderColor: materialPreviewBorderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewDot,
                    { backgroundColor: materialPreviewAccent },
                  ]}
                />
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: materialPreviewLineStrong },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.previewTall,
                  { backgroundColor: materialPreviewAccent },
                ]}
              />
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: materialPreviewCardSecondaryBackground,
                    borderColor: materialPreviewBorderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewLine,
                    {
                      backgroundColor: materialPreviewLineStrong,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.previewLineShort,
                    {
                      backgroundColor: materialPreviewLineSoft,
                    },
                  ]}
                />
              </View>
            </View>
          </Pressable>

          <View
            style={[
              styles.appearanceNoteCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={styles.appearanceNoteRow}>
              <View
                style={[
                  styles.appearanceNoteDot,
                  {
                    backgroundColor: isCompanyMode
                      ? companyCardAccent
                      : materialCardAccent,
                  },
                ]}
              />
              <Text
                style={[styles.appearanceNoteLabel, { color: accentTextColor }]}
              >
                Совместимость
              </Text>
            </View>
            <Text
              style={[
                styles.appearanceNoteText,
                { color: palette.onSurfaceMuted },
              ]}
            >
              Внешний вид Material You зависит от версии Android и оболочки
              устройства. На некоторых устройствах системная тема может
              отображаться иначе.
            </Text>
          </View>
        </View>
      )}
    </AnimatedEntranceView>
  );

  const renderPreferences = () => (
    <AnimatedEntranceView
      delay={40}
      style={[
        styles.sectionCard,
        {
          backgroundColor: rootCardBackground,
          borderColor: palette.outlineVariant,
        },
      ]}
    >
      <View
        style={[
          styles.heroAccentBar,
          {
            backgroundColor: isCompanyMode ? palette.primary : materialSolidAccent,
          },
        ]}
      />
      <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
        Персонализация
      </Text>
      <View style={styles.preferencesHeaderText}>
        <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
          Анимация и отклик
        </Text>
        <Text
          style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}
        >
          Анимация, отклик и читаемость интерфейса.
        </Text>
      </View>

      <View style={styles.preferencesPanel}>
        <View style={styles.preferencesRow}>
          <View style={styles.preferencesLabelWrap}>
            <Text
              style={[styles.preferencesTitle, { color: palette.onSurface }]}
            >
              Интенсивность анимаций
            </Text>
            <Text
              style={[
                styles.preferencesSubtitle,
                { color: secondaryMutedColor },
              ]}
            >
              Насколько выражено двигаются и появляются элементы интерфейса.
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {(
              [
                ['full', 'Полная'],
                ['standard', 'Стандарт'],
                ['minimal', 'Минимум'],
              ] as const
            ).map(([value, label]) => {
              const isSelected = androidTheme.motionIntensity === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected
                        ? accentSurface
                        : palette.surface,
                      borderColor: isSelected
                        ? isCompanyMode
                          ? palette.primaryStrong
                          : materialPalette.primaryStrong
                        : palette.outlineVariant,
                    },
                    isSelected ? styles.segmentButtonActive : null,
                  ]}
                  onPress={() => {
                    androidRustleHaptic();
                    androidTheme.setMotionIntensity(value);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color: isSelected
                          ? accentTextColor
                          : palette.onSurfaceMuted,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.preferencesRow}>
          <View style={styles.preferencesLabelWrap}>
            <Text
              style={[styles.preferencesTitle, { color: palette.onSurface }]}
            >
              Сила отклика
            </Text>
            <Text
              style={[
                styles.preferencesSubtitle,
                { color: secondaryMutedColor },
              ]}
            >
              Характер вибрации и плотность хаптиков при взаимодействиях.
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {(
              [
                ['soft', 'Мягкий'],
                ['normal', 'Обычный'],
                ['expressive', 'Выразит.'],
              ] as const
            ).map(([value, label]) => {
              const isSelected = androidTheme.hapticStrength === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected
                        ? accentSurface
                        : palette.surface,
                      borderColor: isSelected
                        ? isCompanyMode
                          ? palette.primaryStrong
                          : materialPalette.primaryStrong
                        : palette.outlineVariant,
                    },
                    isSelected ? styles.segmentButtonActive : null,
                  ]}
                  onPress={() => {
                    androidTheme.setHapticStrength(value);
                    androidRustleHaptic();
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color: isSelected
                          ? accentTextColor
                          : palette.onSurfaceMuted,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.preferencesRow}>
          <View style={styles.preferencesLabelWrap}>
            <Text
              style={[styles.preferencesTitle, { color: palette.onSurface }]}
            >
              Повышенный контраст
            </Text>
            <Text
              style={[
                styles.preferencesSubtitle,
                { color: secondaryMutedColor },
              ]}
            >
              Усиливает границы, разделители и читаемость в Material You.
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {(
              [
                ['balanced', 'Обычный'],
                ['high', 'Высокий'],
              ] as const
            ).map(([value, label]) => {
              const isSelected = androidTheme.contrastMode === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected
                        ? accentSurface
                        : palette.surface,
                      borderColor: isSelected
                        ? isCompanyMode
                          ? palette.primaryStrong
                          : materialPalette.primaryStrong
                        : palette.outlineVariant,
                    },
                    isSelected ? styles.segmentButtonActive : null,
                  ]}
                  onPress={() => {
                    androidRustleHaptic();
                    androidTheme.setContrastMode(value);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color: isSelected
                          ? accentTextColor
                          : palette.onSurfaceMuted,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </AnimatedEntranceView>
  );

  const renderPortal = () => (
    <>
      <AnimatedEntranceView
        delay={40}
        style={[
          styles.sectionCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: palette.outlineVariant,
          },
        ]}
      >
        <View
          style={[
            styles.heroAccentBar,
            {
              backgroundColor: isCompanyMode ? palette.primary : materialSolidAccent,
            },
          ]}
        />
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Инструменты
        </Text>
        <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
          Доступ на портал
        </Text>
        <Text style={[styles.navRowSubtitle, { color: secondaryMutedColor }]}>
          Быстрый вход в портал сотрудника с PIN и подтверждением входа.
        </Text>

        <View style={styles.portalHeroGrid}>
          <View style={styles.portalStatRow}>
            <View
              style={[
                styles.portalStatCard,
                {
                  backgroundColor: palette.surfaceRaised,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <Text
                style={[styles.portalStatLabel, { color: heroKickerColor }]}
              >
                Статус
              </Text>
              <Text
                style={[styles.portalStatValue, { color: palette.onSurface }]}
              >
                {isPortalLoading ? 'Загрузка…' : portalStatusLabel}
              </Text>
            </View>
            <View
              style={[
                styles.portalStatCard,
                {
                  backgroundColor: palette.surfaceRaised,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <Text
                style={[styles.portalStatLabel, { color: heroKickerColor }]}
              >
                PIN-код
              </Text>
              <Text
                style={[styles.portalStatValue, { color: palette.onSurface }]}
              >
                {portalSession.pin || '--------'}
              </Text>
            </View>
          </View>
        </View>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={110}
        style={[
          styles.portalLinkCard,
          {
            backgroundColor: portalPanelBackground,
            borderColor: palette.outlineVariant,
          },
        ]}
      >
        <Text style={[styles.portalLinkLabel, { color: heroKickerColor }]}>
          Ссылка на портал
        </Text>
        <Text style={[styles.portalLinkValue, { color: palette.onSurface }]}>
          {portalSession.portalUrl
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '')}
        </Text>
        <View style={styles.inlineActionRow}>
          <TouchableOpacity
            style={[
              styles.inlineActionButton,
              {
                backgroundColor: palette.surfaceAccent,
                borderColor: palette.outlineVariant,
              },
            ]}
            onPress={openPortal}
          >
            <Text
              style={[styles.inlineActionText, { color: palette.onSurface }]}
            >
              Открыть в браузере
            </Text>
          </TouchableOpacity>
        </View>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={180}
        style={[
          styles.portalCodeCard,
          {
            backgroundColor: portalSecondaryPanel,
            borderColor: palette.outlineVariant,
          },
        ]}
      >
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          {portalError
            ? portalError
            : portalSession.status === 'pending_confirm'
            ? 'Введи PIN на портале и подтверди вход в приложении.'
            : portalSession.status === 'active'
            ? 'Сессия активна. При необходимости её можно завершить вручную.'
            : 'Запроси PIN, открой портал и подтверди вход.'}
        </Text>
        {formattedPortalExpiry ? (
          <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
            Действует до: {formattedPortalExpiry}
          </Text>
        ) : null}
      </AnimatedEntranceView>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: ctaBackground,
              borderColor: ctaBorderColor,
            },
          ]}
          onPress={handlePortalPrimaryAction}
          disabled={isPortalLoading || isPortalRefreshing}
        >
          <Text style={[styles.primaryButtonText, { color: ctaTextColor }]}>
            {portalActionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderBlackBox = () => (
    <>
      <AnimatedEntranceView
        delay={40}
        style={[
          styles.heroGlowCard,
          {
            backgroundColor: portalHeroBackground,
            borderColor: heroBorderColor,
          },
        ]}
      >
        <View
          style={[
            styles.heroAccentBar,
            {
              backgroundColor: isCompanyMode ? palette.primary : materialSolidAccent,
            },
          ]}
        />
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Инструменты
        </Text>
        <Text style={[styles.heroTitle, { color: palette.onSurface }]}>
          Чёрный ящик
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          Конфиденциальное обращение руководству. Опишите претензию или проблему
          текстом.
        </Text>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={90}
        style={[
          styles.sectionCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: palette.outlineVariant,
          },
        ]}
      >
        <TextInput
          value={blackBoxMessage}
          onChangeText={text => {
            setBlackBoxMessage(text);
            setBlackBoxError(null);
            setBlackBoxSuccess(null);
          }}
          style={[
            styles.blackBoxInput,
            {
              color: palette.onSurface,
              backgroundColor: palette.surface,
              borderColor: palette.outlineVariant,
            },
          ]}
          placeholder="Напишите вашу претензию"
          placeholderTextColor={secondaryMutedColor}
          multiline
          textAlignVertical="top"
          maxLength={1200}
          editable={!isBlackBoxSubmitting}
        />

        {blackBoxError ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.errorContainer,
                borderColor: palette.errorBorder,
              },
            ]}
          >
            <Text style={[styles.feedbackTitle, { color: palette.error }]}>
              Ошибка
            </Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>
              {blackBoxError}
            </Text>
          </View>
        ) : null}

        {blackBoxSuccess ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.successContainer,
                borderColor: palette.successBorder,
              },
            ]}
          >
            <Text style={[styles.feedbackTitle, { color: palette.success }]}>
              Отправлено
            </Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>
              {blackBoxSuccess}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: ctaBackground,
              borderColor: ctaBorderColor,
              opacity: isBlackBoxSubmitting ? 0.7 : 1,
            },
          ]}
          onPress={() => {
            handleSubmitBlackBox().catch(() => {});
          }}
          disabled={isBlackBoxSubmitting}
        >
          <Text style={[styles.primaryButtonText, { color: ctaTextColor }]}>
            {isBlackBoxSubmitting ? 'Отправляем…' : 'Отправить сообщение'}
          </Text>
        </TouchableOpacity>
      </AnimatedEntranceView>
    </>
  );

  const renderIdea = () => (
    <>
      <AnimatedEntranceView
        delay={40}
        style={[
          styles.heroGlowCard,
          {
            backgroundColor: portalHeroBackground,
            borderColor: heroBorderColor,
          },
        ]}
      >
        <View
          style={[
            styles.heroAccentBar,
            {
              backgroundColor: isCompanyMode ? palette.primary : materialSolidAccent,
            },
          ]}
        />
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Инструменты
        </Text>
        <Text style={[styles.heroTitle, { color: palette.onSurface }]}>
          У меня есть идея
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          Опишите инициативу по работе магазина. Сообщение уйдёт руководству на модерацию.
        </Text>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={90}
        style={[
          styles.sectionCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: palette.outlineVariant,
          },
        ]}
      >
        <TextInput
          value={ideaMessage}
          onChangeText={text => {
            setIdeaMessage(text);
            setIdeaError(null);
            setIdeaSuccess(null);
          }}
          style={[
            styles.blackBoxInput,
            {
              color: palette.onSurface,
              backgroundColor: palette.surface,
              borderColor: palette.outlineVariant,
            },
          ]}
          placeholder="Опишите идею"
          placeholderTextColor={secondaryMutedColor}
          multiline
          textAlignVertical="top"
          maxLength={1200}
          editable={!isIdeaSubmitting}
        />

        {ideaError ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.errorContainer,
                borderColor: palette.errorBorder,
              },
            ]}
          >
            <Text style={[styles.feedbackTitle, { color: palette.error }]}>
              Ошибка
            </Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>
              {ideaError}
            </Text>
          </View>
        ) : null}

        {ideaSuccess ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.successContainer,
                borderColor: palette.successBorder,
              },
            ]}
          >
            <Text style={[styles.feedbackTitle, { color: palette.success }]}>
              Отправлено
            </Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>
              {ideaSuccess}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: ctaBackground,
              borderColor: ctaBorderColor,
              opacity: isIdeaSubmitting ? 0.7 : 1,
            },
          ]}
          onPress={() => {
            handleSubmitIdea().catch(() => {});
          }}
          disabled={isIdeaSubmitting}
        >
          <Text style={[styles.primaryButtonText, { color: ctaTextColor }]}>
            {isIdeaSubmitting ? 'Отправляем…' : 'Отправить идею'}
          </Text>
        </TouchableOpacity>
      </AnimatedEntranceView>
    </>
  );

  const renderHouseholdOrder = () => (
    <>
      <AnimatedEntranceView
        delay={40}
        style={[
          styles.heroGlowCard,
          {
            backgroundColor: portalHeroBackground,
            borderColor: heroBorderColor,
          },
        ]}
      >
        <View
          style={[
            styles.heroAccentBar,
            {
              backgroundColor: isCompanyMode ? palette.primary : materialSolidAccent,
            },
          ]}
        />
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Инструменты
        </Text>
        <Text style={[styles.heroTitle, { color: palette.onSurface }]}>
          Заказ хозтоваров и размена
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          Выберите режим, заполните заявку и отправьте на сервер.
        </Text>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={90}
        style={[
          styles.sectionCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: palette.outlineVariant,
          },
        ]}
      >
        <View style={styles.preferencesRow}>
          <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Режим заявки</Text>
          <View style={styles.segmentRow}>
            {(
              [
                ['goods', 'Хозтовары'],
                ['exchange', 'Размен'],
              ] as const
            ).map(([value, label]) => {
              const isSelected = householdToolMode === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? accentSurface : palette.surface,
                      borderColor: isSelected ? ctaBorderColor : palette.outlineVariant,
                    },
                  ]}
                  onPress={() => {
                    setHouseholdToolMode(value);
                    setHouseholdError(null);
                    setHouseholdSuccess(null);
                    androidRustleHaptic();
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      { color: isSelected ? accentTextColor : palette.onSurfaceMuted },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.preferencesRow}>
          <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Магазин</Text>
          {isHouseholdShopsLoading ? (
            <View
              style={[
                styles.noticeCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <Text style={[styles.noticeText, { color: secondaryMutedColor }]}>
                Загружаем магазины региона…
              </Text>
            </View>
          ) : householdShops.length === 0 ? (
            <View
              style={[
                styles.noticeCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <Text style={[styles.noticeText, { color: secondaryMutedColor }]}>
                {householdShopsError ?? 'Нет доступных магазинов для заказа'}
              </Text>
            </View>
          ) : (
            <View style={styles.guideTopicGrid}>
              {householdShops.map(shop => {
                const isSelected = shop.id === householdSelectedShopId;
                return (
                  <Pressable
                    key={shop.id}
                    style={[
                      styles.householdChip,
                      {
                        backgroundColor: isSelected ? accentSurface : palette.surface,
                        borderColor: isSelected ? ctaBorderColor : palette.outlineVariant,
                      },
                    ]}
                    onPress={() => {
                      setHouseholdSelectedShopId(shop.id);
                      setHouseholdError(null);
                      setHouseholdSuccess(null);
                      androidRustleHaptic();
                    }}
                  >
                    <Text
                      style={[
                        styles.guideTopicChipText,
                        { color: isSelected ? accentTextColor : palette.onSurface },
                      ]}
                    >
                      {shop.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {householdToolMode === 'goods' ? (
          <>
            <View style={styles.preferencesRow}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Список хозтоваров</Text>
              <TextInput
                value={householdCatalogQuery}
                onChangeText={text => {
                  setHouseholdCatalogQuery(text);
                  setHouseholdError(null);
                  setHouseholdSuccess(null);
                }}
                style={[
                  styles.householdInput,
                  {
                    color: palette.onSurface,
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                  },
                ]}
                placeholder="Поиск по списку"
                placeholderTextColor={secondaryMutedColor}
              />
              {isHouseholdCatalogLoading ? (
                <View
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <Text style={[styles.noticeText, { color: secondaryMutedColor }]}>
                    Загружаем позиции из базы…
                  </Text>
                </View>
              ) : filteredHouseholdCatalog.length === 0 ? (
                <View
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <Text style={[styles.noticeText, { color: secondaryMutedColor }]}>
                    {householdCatalogError ?? 'Позиции не найдены'}
                  </Text>
                </View>
              ) : (
                <>
                  <View
                    style={[
                      styles.householdCatalogWrap,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.householdCatalogContent}>
                      {visibleHouseholdCatalog.map(item => (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.householdChip,
                            {
                              backgroundColor: palette.surface,
                              borderColor: palette.outlineVariant,
                            },
                          ]}
                          onPress={() => {
                            upsertHouseholdItem(item, 1);
                          }}
                        >
                          <Text style={[styles.guideTopicChipText, { color: palette.onSurface }]}>
                            {item.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  {hasMoreHouseholdCatalog || canCollapseHouseholdCatalog ? (
                    <View style={styles.inlineActionRow}>
                      {hasMoreHouseholdCatalog ? (
                        <TouchableOpacity
                          style={[
                            styles.inlineActionButton,
                            {
                              backgroundColor: palette.surface,
                              borderColor: palette.outlineVariant,
                            },
                          ]}
                          onPress={() =>
                            setHouseholdCatalogVisibleCount(prev =>
                              Math.min(
                                prev + HOUSEHOLD_CATALOG_PAGE_SIZE,
                                filteredHouseholdCatalog.length,
                              ),
                            )
                          }
                        >
                          <Text style={[styles.inlineActionText, { color: palette.onSurface }]}>
                            {`Показать ещё (${filteredHouseholdCatalog.length - visibleHouseholdCatalog.length})`}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {canCollapseHouseholdCatalog ? (
                        <TouchableOpacity
                          style={[
                            styles.inlineActionButton,
                            {
                              backgroundColor: palette.surface,
                              borderColor: palette.outlineVariant,
                            },
                          ]}
                          onPress={() =>
                            setHouseholdCatalogVisibleCount(HOUSEHOLD_CATALOG_PAGE_SIZE)
                          }
                        >
                          <Text style={[styles.inlineActionText, { color: palette.onSurfaceMuted }]}>
                            Скрыть список
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.preferencesRow}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Позиции в заявке</Text>
              {householdItems.length === 0 ? (
                <View
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <Text style={[styles.noticeText, { color: secondaryMutedColor }]}>
                    Пока пусто. Добавьте позиции из списка хозтоваров.
                  </Text>
                </View>
              ) : (
                <View style={styles.rowList}>
                  {householdItems.map(item => (
                    <View
                      key={item.id}
                      style={[
                        styles.householdItemCard,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.outlineVariant,
                        },
                      ]}
                    >
                      <View style={styles.householdItemHeader}>
                        <Text style={[styles.householdItemName, { color: palette.onSurface }]}>
                          {item.name}
                        </Text>
                        <Pressable onPress={() => removeHouseholdItem(item.id)}>
                          <Text style={[styles.householdItemRemove, { color: palette.error }]}>
                            Удалить
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.householdQtyRow}>
                        <Pressable
                          style={[
                            styles.householdQtyButton,
                            {
                              backgroundColor: palette.surfaceMuted,
                              borderColor: palette.outlineVariant,
                            },
                          ]}
                          onPress={() => setHouseholdItemQuantity(item.id, item.quantity - 1)}
                        >
                          <Text style={[styles.householdQtyButtonText, { color: palette.onSurface }]}>
                            –
                          </Text>
                        </Pressable>
                        <Text style={[styles.householdQtyValue, { color: palette.onSurface }]}>
                          {item.quantity} шт
                        </Text>
                        <Pressable
                          style={[
                            styles.householdQtyButton,
                            {
                              backgroundColor: palette.surfaceMuted,
                              borderColor: palette.outlineVariant,
                            },
                          ]}
                          onPress={() => setHouseholdItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Text style={[styles.householdQtyButtonText, { color: palette.onSurface }]}>
                            +
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.preferencesRow}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Сумма размена</Text>
              <TextInput
                value={exchangeAmount}
                onChangeText={text => {
                  setExchangeAmount(text.replace(',', '.'));
                  setHouseholdError(null);
                  setHouseholdSuccess(null);
                }}
                style={[
                  styles.householdInput,
                  {
                    color: palette.onSurface,
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                  },
                ]}
                placeholder="Например: 15000"
                placeholderTextColor={secondaryMutedColor}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.preferencesRow}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Комментарий к размену</Text>
              <TextInput
                value={exchangeComment}
                onChangeText={text => {
                  setExchangeComment(text);
                  setHouseholdError(null);
                  setHouseholdSuccess(null);
                }}
                style={[
                  styles.householdInput,
                  styles.householdCommentInput,
                  {
                    color: palette.onSurface,
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                  },
                ]}
                placeholder="Например: 10×1000, 20×500, 50×100"
                placeholderTextColor={secondaryMutedColor}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>
          </>
        )}

        <View style={styles.preferencesRow}>
          <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Приоритет</Text>
          <View style={styles.segmentRow}>
            {(
              [
                ['normal', 'Обычный'],
                ['urgent', 'Срочный'],
              ] as const
            ).map(([value, label]) => {
              const isSelected = householdPriority === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? accentSurface : palette.surface,
                      borderColor: isSelected ? ctaBorderColor : palette.outlineVariant,
                    },
                  ]}
                  onPress={() => {
                    setHouseholdPriority(value);
                    setHouseholdError(null);
                    setHouseholdSuccess(null);
                    androidRustleHaptic();
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      { color: isSelected ? accentTextColor : palette.onSurfaceMuted },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {householdToolMode === 'goods' ? (
          <View style={styles.preferencesRow}>
            <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>Комментарий</Text>
            <TextInput
              value={householdComment}
              onChangeText={text => {
                setHouseholdComment(text);
                setHouseholdError(null);
                setHouseholdSuccess(null);
              }}
              style={[
                styles.householdInput,
                styles.householdCommentInput,
                {
                  color: palette.onSurface,
                  backgroundColor: palette.surface,
                  borderColor: palette.outlineVariant,
                },
              ]}
              placeholder="Что важно учесть при доставке/выдаче"
              placeholderTextColor={secondaryMutedColor}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        ) : null}

        {householdToolMode === 'goods' && householdItems.length > 0 ? (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.noticeText, { color: palette.onSurface }]}>
              {`Итог заявки: ${householdItems.length} поз. · ${householdTotalUnits} шт.`}
            </Text>
            <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
              {`Магазин: ${householdPayload.shop_name || 'не выбран'} · Приоритет: ${
                householdPriority === 'urgent' ? 'Срочный' : 'Обычный'
              }`}
            </Text>
          </View>
        ) : null}

        {householdToolMode === 'exchange' && exchangeAmount.trim().length > 0 ? (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.noticeText, { color: palette.onSurface }]}>
              {`Сумма размена: ${exchangeAmount}`}
            </Text>
            <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
              {`Магазин: ${exchangeSubmitPayload.shop_name || 'не выбран'} · Приоритет: ${
                householdPriority === 'urgent' ? 'Срочный' : 'Обычный'
              }`}
            </Text>
          </View>
        ) : null}

        {householdError ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.errorContainer,
                borderColor: palette.errorBorder,
              },
            ]}
          >
            <Text style={[styles.feedbackTitle, { color: palette.error }]}>Ошибка</Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>{householdError}</Text>
          </View>
        ) : null}

        {householdSuccess ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.successContainer,
                borderColor: palette.successBorder,
              },
            ]}
          >
            <Text style={[styles.feedbackTitle, { color: palette.success }]}>Готово</Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>
              {householdSuccess}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: ctaBackground,
              borderColor: ctaBorderColor,
              opacity: isHouseholdSubmitting ? 0.7 : 1,
            },
          ]}
          onPress={() => {
            (householdToolMode === 'goods'
              ? handleHouseholdSubmit()
              : handleExchangeSubmit()
            ).catch(() => {});
          }}
          disabled={isHouseholdSubmitting}
        >
          <Text style={[styles.primaryButtonText, { color: ctaTextColor }]}>
            {isHouseholdSubmitting
              ? 'Отправляем…'
              : householdToolMode === 'goods'
              ? 'Отправить заявку'
              : 'Отправить заявку на размен'}
          </Text>
        </TouchableOpacity>
      </AnimatedEntranceView>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {route === 'root'
          ? renderHeader('Ещё', 'Настройки, доступы и внутренние сервисы')
          : null}
        {route === 'appearance'
          ? renderHeader(
              'Оформление',
              'Управление визуальным стилем приложения',
            )
          : null}
        {route === 'portal'
          ? renderHeader('Портал', 'Быстрый вход в веб-портал сотрудника')
          : null}
        {route === 'notifications'
          ? renderHeader('Уведомления', 'Лента событий и открытия смен')
          : null}
        {route === 'preferences'
          ? renderHeader(
              'Персонализация',
              'Дополнительные настройки приложения',
            )
          : null}
        {route === 'black-box'
          ? renderHeader('Чёрный ящик', 'Конфиденциальное обращение руководству')
          : null}
        {route === 'idea'
          ? renderHeader('У меня есть идея', 'Предложение руководству')
          : null}
        {route === 'household-order'
          ? renderHeader('Хозтовары', 'Подготовка и отправка заявки')
          : null}

        {route === 'root' ? renderRoot() : null}
        {route === 'appearance' ? renderAppearance() : null}
        {route === 'portal' ? renderPortal() : null}
        {route === 'notifications' ? renderNotifications() : null}
        {route === 'preferences' ? renderPreferences() : null}
        {route === 'black-box' ? renderBlackBox() : null}
        {route === 'idea' ? renderIdea() : null}
        {route === 'household-order' ? renderHouseholdOrder() : null}
      </ScrollView>
    </View>
  );
}
