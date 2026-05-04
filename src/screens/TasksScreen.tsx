import React from 'react'
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ElasticScrollView from '../components/ElasticScrollView'
import { tasksApi, type TaskItem } from '../features/tasks/tasksApi'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  type AndroidThemePalette,
  getAndroidCompanyPalette,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'

type TasksScreenProps = {
  employeeId: string
  isActive?: boolean
}

const iosPalette: AndroidThemePalette = {
  background: '#000000',
  surface: '#111111',
  surfaceRaised: '#171717',
  surfaceMuted: '#1C1C1E',
  surfaceAccent: '#202023',
  outline: '#2C2C2E',
  outlineVariant: '#242427',
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
  secondaryButton: '#1B1B1D',
}

function formatDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

function TaskCard({
  task,
  role,
  palette,
}: {
  task: TaskItem
  role: 'toMe' | 'byMe'
  palette: AndroidThemePalette
}) {
  const dueDate = formatDate(task.dueDate)
  const dueLabel = dueDate ? `до ${dueDate}` : task.dueDays ? `${task.dueDays} дн.` : 'срок не указан'

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.outlineVariant,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ color: palette.onSurfaceMuted, fontSize: 12, fontWeight: '700' }}>{dueLabel}</Text>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: task.status === 'closed' ? palette.surfaceMuted : palette.successContainer,
            borderColor: task.status === 'closed' ? palette.outline : palette.successBorder,
          }}
        >
          <Text style={{ color: palette.onSurface, fontSize: 11, fontWeight: '800' }}>
            {task.status === 'closed' ? 'Закрыта' : 'Активна'}
          </Text>
        </View>
      </View>
      <Text style={{ color: palette.onSurface, fontSize: 16, lineHeight: 22, fontWeight: '700' }}>
        {task.description}
      </Text>
      <Text style={{ color: palette.onSurfaceMuted, fontSize: 13, lineHeight: 17 }}>
        {role === 'toMe' ? `Поставил: ${task.assignedByName ?? '—'}` : `Исполнитель: ${task.assignedToName ?? '—'}`}
      </Text>
      {task.hasPhoto ? (
        <Text style={{ color: palette.primaryStrong, fontSize: 12, fontWeight: '700' }}>Есть фото к задаче</Text>
      ) : null}
    </View>
  )
}

export default function TasksScreen({ employeeId, isActive = true }: TasksScreenProps) {
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()
  const androidTheme = useAndroidThemeMode()
  const isAndroid = Platform.OS === 'android'
  const isDark = colorScheme === 'dark'
  const palette = React.useMemo(
    () =>
      isAndroid
        ? androidTheme.mode === 'company'
          ? getAndroidCompanyPalette()
          : getAndroidThemePalette(isDark, androidTheme.contrastMode)
        : iosPalette,
    [androidTheme.contrastMode, androidTheme.mode, isAndroid, isDark],
  )

  const [assignedToMe, setAssignedToMe] = React.useState<TaskItem[]>([])
  const [assignedByMe, setAssignedByMe] = React.useState<TaskItem[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const load = React.useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        const data = await tasksApi.list(employeeId)
        setAssignedToMe(data.assignedToMe)
        setAssignedByMe(data.assignedByMe)
      } catch (loadError) {
        setAssignedToMe([])
        setAssignedByMe([])
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить задачи')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [employeeId],
  )

  React.useEffect(() => {
    if (!isActive) return
    load(false).catch(() => {})
  }, [isActive, load])

  return (
    <ElasticScrollView
      enableTopElastic={false}
      enableBottomElastic
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: Math.max(insets.top + 8, 24),
        paddingBottom: 146,
        gap: 14,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            load(true).catch(() => {})
          }}
          tintColor={palette.primary}
          colors={[palette.primary]}
          progressBackgroundColor={palette.surfaceRaised}
        />
      }
    >
      <View
        style={{
          backgroundColor: palette.surfaceRaised,
          borderWidth: 1,
          borderColor: palette.outline,
          borderRadius: 30,
          paddingHorizontal: 18,
          paddingVertical: 16,
          gap: 8,
        }}
      >
        <Text style={{ color: palette.primaryStrong, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
          ЗАДАЧИ
        </Text>
        <Text style={{ color: palette.onSurface, fontSize: 34, fontWeight: '900', lineHeight: 38 }}>
          Рабочие задачи
        </Text>
        <Text style={{ color: palette.onSurfaceMuted, fontSize: 15, lineHeight: 21 }}>
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 }}>
          <ActivityIndicator color={palette.primary} />
          <Text style={{ color: palette.onSurfaceMuted, fontSize: 14 }}>Загружаем задачи…</Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            backgroundColor: palette.errorContainer,
            borderWidth: 1,
            borderColor: palette.errorBorder,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 4,
          }}
        >
          <Text style={{ color: palette.onSurface, fontSize: 14, fontWeight: '800' }}>Ошибка</Text>
          <Text style={{ color: palette.onSurface, fontSize: 14, lineHeight: 19 }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text style={{ color: palette.onSurface, fontSize: 24, fontWeight: '900', lineHeight: 28, paddingHorizontal: 2 }}>
          Назначены мне
        </Text>
        {assignedToMe.length ? (
          assignedToMe.map(task => <TaskCard key={`to-${task.id}`} task={task} role="toMe" palette={palette} />)
        ) : (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.outlineVariant,
              backgroundColor: palette.surface,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: palette.onSurfaceMuted, fontSize: 14 }}>Активных задач нет</Text>
          </View>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ color: palette.onSurface, fontSize: 24, fontWeight: '900', lineHeight: 28, paddingHorizontal: 2 }}>
          Поставлены мной
        </Text>
        {assignedByMe.length ? (
          assignedByMe.map(task => <TaskCard key={`by-${task.id}`} task={task} role="byMe" palette={palette} />)
        ) : (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.outlineVariant,
              backgroundColor: palette.surface,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: palette.onSurfaceMuted, fontSize: 14 }}>Пока ничего не назначено</Text>
          </View>
        )}
      </View>
    </ElasticScrollView>
  )
}

