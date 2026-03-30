import { buildApiUrl } from '../../config/api'

export type NotificationItem = {
  id: number
  employee_id: number
  type: string
  category: string
  title: string
  body: string | null
  payload: Record<string, unknown> | null
  is_read: boolean
  created_at: string | null
  read_at: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function formatIsoDateLabel(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getRelativeDayLabel(date: Date) {
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  const diffMs = today.getTime() - target.getTime()
  const diffDays = Math.round(diffMs / 86400000)

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays === 2) return 'Позавчера'
  return null
}

function formatDateFromPayload(reportDate: string, openTime: string) {
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(reportDate)

  if (!isoDateMatch) {
    return null
  }

  const [, year, month, day] = isoDateMatch
  const time = openTime.slice(0, 5)
  const now = new Date()
  const currentYear = now.getFullYear()
  const numericYear = Number(year)
  const baseDate = new Date(Number(year), Number(month) - 1, Number(day))
  const relativeLabel = getRelativeDayLabel(baseDate)

  if (relativeLabel) {
    return `${relativeLabel} в ${time}`
  }

  const dateLabel = formatIsoDateLabel(baseDate)

  if (numericYear !== currentYear) {
    return `${dateLabel} ${year} в ${time}`
  }

  return `${dateLabel} в ${time}`
}

function formatDateFromCreatedAt(createdAt: string) {
  const date = new Date(createdAt)

  if (Number.isNaN(date.getTime())) {
    return createdAt
  }

  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const timeLabel = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  const relativeLabel = getRelativeDayLabel(date)

  if (relativeLabel) {
    return `${relativeLabel} в ${timeLabel}`
  }

  const dateLabel = formatIsoDateLabel(date)

  if (!sameYear) {
    return `${dateLabel} ${date.getFullYear()} в ${timeLabel}`
  }

  return `${dateLabel} в ${timeLabel}`
}

type NotificationsListResponse = {
  notifications?: Array<{
    id?: number | null
    employee_id?: number | null
    type?: string | null
    category?: string | null
    title?: string | null
    body?: string | null
    payload?: Record<string, unknown> | string | null
    is_read?: number | boolean | null
    created_at?: string | null
    read_at?: string | null
  }>
}

function normalizePayload(payload: Record<string, unknown> | string | null | undefined) {
  if (!payload) return null

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }

  return payload
}

function normalizeNotification(
  item: NonNullable<NotificationsListResponse['notifications']>[number],
): NotificationItem {
  return {
    id: Number(item.id ?? 0),
    employee_id: Number(item.employee_id ?? 0),
    type: String(item.type || ''),
    category: String(item.category || ''),
    title: String(item.title || ''),
    body: item.body ? String(item.body) : null,
    payload: normalizePayload(item.payload),
    is_read: item.is_read === true || Number(item.is_read ?? 0) === 1,
    created_at: item.created_at ? String(item.created_at) : null,
    read_at: item.read_at ? String(item.read_at) : null,
  }
}

export const notificationsApi = {
  async list(employeeId: string): Promise<NotificationItem[]> {
    const res = await fetch(buildApiUrl(`/employees/${encodeURIComponent(employeeId)}/notifications`))

    if (res.status === 404 || res.status === 501) {
      return []
    }

    if (!res.ok) {
      throw new Error(`Notifications HTTP ${res.status}`)
    }

    const data = (await res.json()) as NotificationsListResponse
    return Array.isArray(data.notifications) ? data.notifications.map(normalizeNotification) : []
  },

  async markRead(employeeId: string, notificationId: number): Promise<void> {
    const res = await fetch(
      buildApiUrl(
        `/employees/${encodeURIComponent(employeeId)}/notifications/${encodeURIComponent(String(notificationId))}/read`,
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (res.status === 404 || res.status === 501) {
      return
    }

    if (!res.ok) {
      throw new Error(`Notification read HTTP ${res.status}`)
    }
  },

  async markAllRead(employeeId: string): Promise<void> {
    const res = await fetch(
      buildApiUrl(`/employees/${encodeURIComponent(employeeId)}/notifications/read-all`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (res.status === 404 || res.status === 501) {
      return
    }

    if (!res.ok) {
      throw new Error(`Notifications read-all HTTP ${res.status}`)
    }
  },

  async remove(employeeId: string, notificationId: number): Promise<void> {
    const res = await fetch(
      buildApiUrl(
        `/employees/${encodeURIComponent(employeeId)}/notifications/${encodeURIComponent(String(notificationId))}`,
      ),
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (res.status === 404 || res.status === 501) {
      return
    }

    if (!res.ok) {
      throw new Error(`Notification delete HTTP ${res.status}`)
    }
  },
}

export function formatNotificationTimestamp(notification: NotificationItem): string {
  const payload = notification.payload

  if (isRecord(payload)) {
    const reportDate = typeof payload.report_date === 'string' ? payload.report_date : null
    const openTime = typeof payload.open_time === 'string' ? payload.open_time : null

    if (reportDate && openTime) {
      const formattedFromPayload = formatDateFromPayload(reportDate, openTime)
      if (formattedFromPayload) {
        return formattedFromPayload
      }
    }
  }

  if (notification.created_at) {
    return formatDateFromCreatedAt(notification.created_at)
  }

  return 'Без даты'
}
