import type {
  CloseShiftPayload,
  OpenShiftPayload,
  OpenedShift,
  ShiftStatus,
  ShopOption,
} from './types'
import { buildApiUrl } from '../../config/api'

export interface ShiftApi {
  getShiftStatus(userId: string): Promise<ShiftStatus>
  getAvailableShops(userId: string, regionId?: number): Promise<ShopOption[]>
  getRegionShops(userId: string): Promise<ShopOption[]>
  getShiftEndPushPayload(userId: string): Promise<{
    shopName?: string
    progress?: number
    remainingMs?: number
  } | null>
  openShift(userId: string, payload: OpenShiftPayload): Promise<ShiftStatus>
  closeShift(userId: string, payload: CloseShiftPayload): Promise<ShiftStatus>
  resetOpenedShift(userId: string): Promise<ShiftStatus>
  ensureShiftEndPush(userId: string): Promise<void>
}

const openShiftByUser = new Map<string, OpenedShift>()

type EmployeeShopsResponse = {
  shops?: Array<{
    id?: number
    shop_name?: string
    name?: string
    shift_opened?: number | boolean
    is_busy?: number | boolean
  }>
}

type ShiftStatusResponse = {
  employee_id?: number
  shift_status?: string
  shop_id?: number | null
  shop_name?: string | null
  report_date?: string | null
  open_time?: string | null
  cash_at_opening?: number | null
  opening_time?: string | null
  closing_time?: string | null
  region_timezone?: string | null
  timezone?: string | null
}

type OpenShiftResponse = {
  message?: string
  shop_id?: number
  shop_name?: string
  report_date?: string
  open_time?: string
  late_minutes?: number
  penalty_points?: number
  penalty_amount_rub?: number
  penalty_message?: string
  late_penalty_message?: string
  on_time_streak?: number
  dc_bonus_points?: number
  bonus_reason?: string
  bonus_message?: string
}

type CloseShiftResponse = {
  message?: string
  error?: string
}

function normalizeReportDate(value?: string | null) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (isoMatch) {
    return isoMatch[1]
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeOpenTime(value?: string | null) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  const hhmmss = raw.match(/^(\d{2}:\d{2}:\d{2})/)
  if (hhmmss) {
    return hhmmss[1]
  }

  const hhmm = raw.match(/^(\d{2}:\d{2})$/)
  if (hhmm) {
    return `${hhmm[1]}:00`
  }

  return ''
}

function normalizeClockTime(value?: string | null) {
  const t = normalizeOpenTime(value)
  return t || undefined
}

function composeOpenedAt(reportDate?: string | null, openTime?: string | null) {
  const datePart = normalizeReportDate(reportDate)
  const timePart = normalizeOpenTime(openTime)
  if (!datePart || !timePart) {
    return ''
  }
  return `${datePart} ${timePart}`
}

function wait(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}

export const mockShiftApi: ShiftApi = {
  async getShiftStatus(userId) {
    await wait(220)

    return {
      openedShift: openShiftByUser.get(userId) ?? null,
      notice: null,
      noticeVariant: null,
    }
  },

  async getAvailableShops(_userId) {
    await wait(220)
    return []
  },

  async getRegionShops(_userId) {
    await wait(220)
    return []
  },
  async getShiftEndPushPayload(_userId) {
    await wait(100)
    return null
  },

  async openShift(userId, payload) {
    await wait(500)

    if (openShiftByUser.has(userId)) {
      throw new Error('Смена уже открыта. Сначала закройте текущую смену.')
    }

    openShiftByUser.set(userId, {
      shopId: payload.shopId,
      shopName: payload.shopName,
      openedAt: new Date().toISOString(),
      cashAtOpening: payload.cashAtOpening,
    })

    return {
      openedShift: openShiftByUser.get(userId) ?? null,
      notice: null,
      noticeVariant: null,
    }
  },

  async closeShift(userId, payload) {
    await wait(500)

    if (!openShiftByUser.has(userId)) {
      throw new Error('Открытая смена не найдена.')
    }

    if (
      payload.revenueTotal <= 0 ||
      payload.checksCount <= 0 ||
      payload.cashlessPayment < 0 ||
      payload.cashDenomination < 0 ||
      !/^\d{9}$/.test(payload.sealNumber)
    ) {
      throw new Error('Проверьте данные закрытия перед отправкой отчета.')
    }

    openShiftByUser.delete(userId)

    return {
      openedShift: null,
      notice: null,
      noticeVariant: null,
    }
  },

  async resetOpenedShift(userId) {
    await wait(300)
    openShiftByUser.delete(userId)

    return {
      openedShift: null,
      notice: null,
      noticeVariant: null,
    }
  },
  async ensureShiftEndPush(_userId) {
    await wait(100)
  },
}

type ResolvedOpenShiftNotice = {
  message: string | null
  variant: 'success' | 'warning' | 'error' | 'info'
}

function resolveOpenShiftNotice(data: OpenShiftResponse | null): ResolvedOpenShiftNotice {
  if (!data) {
    return { message: null, variant: 'info' }
  }

  const explicitPenaltyMessage =
    typeof data.penalty_message === 'string' && data.penalty_message.trim()
      ? data.penalty_message.trim()
      : typeof data.late_penalty_message === 'string' && data.late_penalty_message.trim()
        ? data.late_penalty_message.trim()
        : null

  if (explicitPenaltyMessage) {
    return {
      message: explicitPenaltyMessage,
      variant: 'warning',
    }
  }

  const lateMinutes = Number(data.late_minutes ?? 0)
  const penaltyPoints = Number(data.penalty_points ?? 0)
  const penaltyAmount = Number(data.penalty_amount_rub ?? 0)
  const hasPenaltySignals =
    (Number.isFinite(lateMinutes) && lateMinutes > 0) ||
    (Number.isFinite(penaltyPoints) && penaltyPoints < 0) ||
    (Number.isFinite(penaltyAmount) && penaltyAmount < 0)

  if (hasPenaltySignals) {
    const latePart = Number.isFinite(lateMinutes) && lateMinutes > 0
      ? `Опоздание: ${lateMinutes} мин.`
      : null
    const amountPart = Number.isFinite(penaltyAmount) && Math.abs(Math.round(penaltyAmount)) > 0
      ? `Депремирование: ${Math.abs(Math.round(penaltyAmount))} ₽.`
      : null
    const pointsPart = Number.isFinite(penaltyPoints) && Math.abs(Math.round(penaltyPoints)) > 0
      ? `Списано: ${Math.abs(Math.round(penaltyPoints))} баллов.`
      : null

    return {
      message:
        [latePart, amountPart, pointsPart].filter(Boolean).join(' ')
        || 'Зафиксировано опоздание при открытии смены.',
      variant: 'warning',
    }
  }

  const explicitMessage =
    typeof data.bonus_message === 'string' && data.bonus_message.trim()
      ? data.bonus_message.trim()
      : typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : null

  if (explicitMessage) {
    return {
      message: explicitMessage,
      variant: 'success',
    }
  }

  const points = Number(data.dc_bonus_points ?? 0)
  const streak = Number(data.on_time_streak ?? 0)
  if (Number.isFinite(points) && points > 0 && Number.isFinite(streak) && streak > 0) {
    return {
      message: `Вам начислено ${points} Dℂ за ${streak}-ю смену подряд без опозданий.`,
      variant: 'success',
    }
  }

  return { message: null, variant: 'info' }
}

export const shiftApi: ShiftApi = {
  ...mockShiftApi,
  async getShiftStatus(userId) {
    const res = await fetch(buildApiUrl(`/shifts/status/${encodeURIComponent(userId)}`))

    if (!res.ok) {
      throw new Error(`Не удалось получить статус смены (HTTP ${res.status})`)
    }

    const data = (await res.json()) as ShiftStatusResponse
    const isOpen = String(data.shift_status ?? '').toLowerCase() === 'open'

    if (!isOpen) {
      openShiftByUser.delete(userId)
      return { openedShift: null, notice: null, noticeVariant: null }
    }

    const openedAtFromServer = composeOpenedAt(data.report_date, data.open_time) || null
    const openedAtFromCache = openShiftByUser.get(userId)?.openedAt ?? ''
    const openedAt = openedAtFromServer ?? openedAtFromCache

    const openedShift: OpenedShift = {
      shopId: data.shop_id ?? undefined,
      shopName: data.shop_name?.trim() || 'Магазин не указан',
      openedAt,
      cashAtOpening: Number(data.cash_at_opening ?? 0),
      shopOpeningTime: normalizeClockTime(data.opening_time),
      shopClosingTime: normalizeClockTime(data.closing_time),
      regionTimezone: data.region_timezone?.trim() || data.timezone?.trim() || undefined,
    }

    openShiftByUser.set(userId, openedShift)
    return { openedShift, notice: null, noticeVariant: null }
  },
  async getAvailableShops(userId) {
    try {
      const availableUrl = buildApiUrl(`/employees/${encodeURIComponent(userId)}/shops/available`)
      const fallbackUrl = buildApiUrl(`/employees/${encodeURIComponent(userId)}/shops`)

      let res = await fetch(availableUrl)
      if (!res.ok && res.status === 404) {
        // Backward compatibility: old backend path.
        res = await fetch(fallbackUrl)
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = (await res.json()) as EmployeeShopsResponse
      const shops = (data.shops ?? [])
        .map(shop => ({
          id: Number(shop.id),
          name: (shop.shop_name ?? shop.name ?? '').trim(),
          isBusy:
            shop.is_busy === 1 ||
            shop.is_busy === true ||
            shop.shift_opened === 1 ||
            shop.shift_opened === true,
        }))
        .filter(shop => Number.isFinite(shop.id) && shop.id > 0 && shop.name.length > 0)
        .filter(shop => !shop.isBusy)
        .map(({ id, name }) => ({ id, name }))

      if (shops.length > 0) {
        return shops
      }
      return []
    } catch {
      return []
    }
  },
  async getRegionShops(userId) {
    try {
      const endpoints = [
        buildApiUrl(`/employees/${encodeURIComponent(userId)}/shops`),
        buildApiUrl(`/employees/${encodeURIComponent(userId)}/shops/all`),
        buildApiUrl(`/employees/${encodeURIComponent(userId)}/shops/region`),
      ]

      let lastStatus = 0
      for (const url of endpoints) {
        const res = await fetch(url)
        lastStatus = res.status
        if (!res.ok) {
          if (res.status === 404) {
            continue
          }
          throw new Error(`HTTP ${res.status}`)
        }

        const data = (await res.json()) as EmployeeShopsResponse
        const shops = (data.shops ?? [])
          .map(shop => ({
            id: Number(shop.id),
            name: (shop.shop_name ?? shop.name ?? '').trim(),
          }))
          .filter(shop => Number.isFinite(shop.id) && shop.id > 0 && shop.name.length > 0)

        return shops
      }

      if (lastStatus === 404) {
        return []
      }
      return []
    } catch {
      return []
    }
  },
  async getShiftEndPushPayload(userId) {
    const endpoints = [
      buildApiUrl(`/employees/${encodeURIComponent(userId)}/shift/end-push-payload`),
      buildApiUrl(`/employees/${encodeURIComponent(userId)}/shift/end-notification`),
      buildApiUrl(`/employees/${encodeURIComponent(userId)}/shift/end_push_payload`),
    ]

    for (const url of endpoints) {
      try {
        const res = await fetch(url)
        if (!res.ok) {
          if (res.status === 404) {
            continue
          }
          return null
        }

        const data = (await res.json()) as {
          payload?: Record<string, unknown>
          shop_name?: string | null
          progress?: number | string
          remaining_ms?: number | string
          start_at_utc?: string
          end_at_utc?: string
          now_at_utc?: string
        }

        const payload = (data?.payload ?? data) as Record<string, unknown> | undefined
        if (!payload) {
          return null
        }

        const progressRaw = Number(
          payload.progress
          ?? payload.progress_percent
          ?? payload.completion
          ?? data?.progress,
        )
        const progress = Number.isFinite(progressRaw)
          ? Math.max(0, Math.min(100, Math.round(progressRaw <= 1 ? progressRaw * 100 : progressRaw)))
          : undefined

        let remainingMs: number | undefined
        const remainingMsRaw = Number(
          payload.remaining_ms
          ?? payload.remainingMs
          ?? data?.remaining_ms,
        )
        if (Number.isFinite(remainingMsRaw) && remainingMsRaw >= 0) {
          remainingMs = remainingMsRaw
        } else {
          const remainingMinutesRaw = Number(payload.remaining_minutes)
          if (Number.isFinite(remainingMinutesRaw) && remainingMinutesRaw >= 0) {
            remainingMs = remainingMinutesRaw * 60_000
          } else {
            const endRaw = String(payload.end_at_utc ?? data?.end_at_utc ?? '').trim()
            const nowRaw = String(payload.now_at_utc ?? data?.now_at_utc ?? '').trim()
            const endMs = Date.parse(endRaw)
            const nowMs = Date.parse(nowRaw) || Date.now()
            if (Number.isFinite(endMs)) {
              remainingMs = Math.max(0, endMs - nowMs)
            }
          }
        }

        let normalizedProgress = progress
        if (normalizedProgress === undefined) {
          const startRaw = String(payload.start_at_utc ?? data?.start_at_utc ?? '').trim()
          const endRaw = String(payload.end_at_utc ?? data?.end_at_utc ?? '').trim()
          const nowRaw = String(payload.now_at_utc ?? data?.now_at_utc ?? '').trim()
          const startMs = Date.parse(startRaw)
          const endMs = Date.parse(endRaw)
          const nowMs = Date.parse(nowRaw) || Date.now()
          if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
            const ratio = Math.max(0, Math.min(1, (nowMs - startMs) / (endMs - startMs)))
            normalizedProgress = Math.round(ratio * 100)
          }
        }

        return {
          shopName: String(payload.shop_name ?? data?.shop_name ?? '').trim() || undefined,
          progress: normalizedProgress,
          remainingMs,
        }
      } catch {
        // try next fallback
      }
    }

    return null
  },
  async openShift(userId, payload) {
    const employeeId = Number(userId)
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error('Некорректный employee_id.')
    }

    const formData = new FormData()
    formData.append('employee_id', String(employeeId))
    formData.append('shop_id', String(payload.shopId))
    formData.append('cash_at_opening', String(payload.cashAtOpening))

    const openingCheckValue = payload.openingReceiptPhotoId.trim()
    const isLocalOpeningCheck =
      openingCheckValue.startsWith('file://') || openingCheckValue.startsWith('content://')

    if (isLocalOpeningCheck) {
      formData.append('photo_opening_check', {
        uri: openingCheckValue,
        type: 'image/jpeg',
        name: `opening-check-${Date.now()}.jpg`,
      } as unknown as Blob)
    } else if (openingCheckValue) {
      formData.append('photo_opening_check_path', openingCheckValue)
    }

    const openingUniformValue = payload.uniformPhotoId.trim()
    const isLocalOpeningUniform =
      openingUniformValue.startsWith('file://') || openingUniformValue.startsWith('content://')

    if (isLocalOpeningUniform) {
      formData.append('photo_opening_em', {
        uri: openingUniformValue,
        type: 'image/jpeg',
        name: `opening-uniform-${Date.now()}.jpg`,
      } as unknown as Blob)
    } else if (openingUniformValue) {
      formData.append('photo_opening_em_path', openingUniformValue)
    }

    const res = await fetch(buildApiUrl('/shifts/open'), {
      method: 'POST',
      body: formData,
    })

    let data: OpenShiftResponse | null = null
    try {
      data = (await res.json()) as OpenShiftResponse
    } catch {
      // ignore invalid json response
    }

    if (!res.ok) {
      const code = (data as { error?: string } | null)?.error

      if (res.status === 409 && code === 'shift_already_open') {
        throw new Error('Смена уже открыта.')
      }
      if (res.status === 403 && code === 'shop_not_in_employee_region') {
        throw new Error('Этот магазин не относится к вашему региону.')
      }
      if (res.status === 400 && code === 'shop_closed') {
        throw new Error('Выбранный магазин сейчас закрыт.')
      }
      if (res.status === 400 && code === 'opening_photos_required') {
        throw new Error('Добавьте фото формы и фото чека открытия.')
      }
      if (res.status === 400 && code === 'opening_receipt_photo_required') {
        throw new Error('Добавьте фото чека открытия.')
      }
      if (res.status === 400 && code === 'opening_uniform_photo_required') {
        throw new Error('Добавьте фото формы.')
      }
      if (res.status === 404 && code === 'shop_not_found') {
        throw new Error('Магазин не найден.')
      }
      if (res.status === 404 && code === 'employee_not_found') {
        throw new Error('Сотрудник не найден.')
      }
      if (res.status === 400 && code === 'invalid_employee_id') {
        throw new Error('Некорректный employee_id.')
      }
      if (res.status === 400 && code === 'invalid_payload') {
        throw new Error('Проверьте сумму размена и выбранный магазин.')
      }
      if (res.status === 409 && code === 'shop_shift_already_open') {
        throw new Error('В этом магазине уже открыта смена.')
      }
      if (typeof data?.message === 'string' && data.message.trim()) {
        throw new Error(data.message.trim())
      }
      if (typeof code === 'string' && code.trim()) {
        throw new Error(`Ошибка сервера: ${code.trim()}`)
      }
      throw new Error('Не удалось открыть смену.')
    }

    const openedAt = composeOpenedAt(data?.report_date, data?.open_time)
      || openShiftByUser.get(userId)?.openedAt
      || ''

    const openedShift: OpenedShift = {
      shopId: data?.shop_id ?? payload.shopId,
      shopName: data?.shop_name ?? payload.shopName,
      openedAt,
      cashAtOpening: payload.cashAtOpening,
      shopOpeningTime: openShiftByUser.get(userId)?.shopOpeningTime,
      shopClosingTime: openShiftByUser.get(userId)?.shopClosingTime,
      regionTimezone: openShiftByUser.get(userId)?.regionTimezone,
    }

    openShiftByUser.set(userId, openedShift)
    const resolvedNotice = resolveOpenShiftNotice(data)

    return {
      openedShift,
      notice: resolvedNotice.message,
      noticeVariant: resolvedNotice.message ? resolvedNotice.variant : null,
    }
  },
  async closeShift(userId, payload) {
    const employeeId = Number(userId)
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error('Некорректный employee_id.')
    }

    const formData = new FormData()
    formData.append('employee_id', String(employeeId))
    formData.append('revenue', String(payload.revenueTotal))
    formData.append('cashless_payment', String(payload.cashlessPayment))
    formData.append('invoices', String(payload.checksCount))
    formData.append('seal_number', payload.sealNumber)
    formData.append('cash_denomination', String(payload.cashDenomination))
    formData.append('comment', payload.comment?.trim() ? payload.comment.trim() : '')

    const photoValue = payload.closingReceiptPhotoId
    const isLocalPhoto =
      photoValue.startsWith('file://') || photoValue.startsWith('content://')

    if (isLocalPhoto) {
      formData.append('closing_receipt_photo', {
        uri: photoValue,
        type: 'image/jpeg',
        name: `close-${Date.now()}.jpg`,
      } as unknown as Blob)
    } else {
      formData.append('closing_receipt_photo_path', photoValue)
    }

    const res = await fetch(buildApiUrl('/shifts/close'), {
      method: 'POST',
      body: formData,
    })

    let data: CloseShiftResponse | null = null
    try {
      data = (await res.json()) as CloseShiftResponse
    } catch {
      // ignore non-JSON response
    }

    if (!res.ok) {
      const code = data?.error
      if (res.status === 404 && code === 'employee_not_found') {
        throw new Error('Сотрудник не найден.')
      }
      if (res.status === 409 && code === 'shift_not_open') {
        throw new Error('Открытая смена не найдена.')
      }
      if (res.status === 404 && code === 'opening_report_not_found') {
        throw new Error('Не найден отчёт открытия смены для закрытия.')
      }
      if (res.status === 400 && code === 'invalid_payload') {
        throw new Error('Проверьте заполнение отчета перед отправкой.')
      }
      if (res.status === 400 && code === 'closing_photo_required') {
        throw new Error('Добавьте фото чека закрытия.')
      }
      if (res.status === 400 && code === 'cashless_gt_revenue') {
        throw new Error('Сумма безналичного расчета не может быть больше суммы выручки.')
      }
      if (res.status === 400 && code === 'invalid_seal_number') {
        throw new Error('Некорректный номер пломбы.')
      }
      if (res.status === 400 && code === 'invalid_cash_denomination') {
        throw new Error('Введите корректную сумму размена в кассе.')
      }
      if (res.status === 409 && code === 'seal_number_not_unique') {
        throw new Error('Номер пломбы уже использован. Попробуйте закрыть смену заново.')
      }
      if (typeof data?.message === 'string' && data.message.trim()) {
        throw new Error(data.message.trim())
      }
      if (typeof data?.error === 'string' && data.error.trim()) {
        throw new Error(`Ошибка сервера: ${data.error.trim()}`)
      }
      throw new Error('Не удалось закрыть смену.')
    }

    openShiftByUser.delete(userId)
    return { openedShift: null, notice: null, noticeVariant: null }
  },
  async resetOpenedShift(userId) {
    const employeeId = Number(userId)
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error('Не удалось сбросить смену: некорректный employee_id.')
    }

    const res = await fetch(buildApiUrl('/shifts/reset-opened'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
      }),
    })

    let data: { error?: string } | null = null
    try {
      data = (await res.json()) as { error?: string }
    } catch {
      // ignore non-JSON response
    }

    if (!res.ok) {
      const code = data?.error
      if (res.status === 404 && code === 'employee_not_found') {
        throw new Error('Сотрудник не найден. Сброс смены невозможен.')
      }
      if (res.status === 400 && code === 'invalid_employee_id') {
        throw new Error('Некорректный employee_id. Сброс смены невозможен.')
      }
      throw new Error('Не удалось сбросить открытую смену.')
    }

    openShiftByUser.delete(userId)
    return { openedShift: null, notice: null, noticeVariant: null }
  },
  async ensureShiftEndPush(userId) {
    const employeeId = Number(userId)
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      return
    }

    const endpoints = [
      buildApiUrl(`/employees/${encodeURIComponent(userId)}/shift/end-push/send`),
      buildApiUrl(`/employees/${encodeURIComponent(userId)}/shift/end-notification/send`),
      buildApiUrl(`/employees/${encodeURIComponent(userId)}/shift/end_push/send`),
    ]

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: employeeId }),
        })

        if (res.ok) {
          return
        }

        if (res.status === 404) {
          continue
        }

        // Нефатально для клиента: планирование пуша не должно ломать основной сценарий смены.
        return
      } catch {
        // Пробуем следующий fallback-эндпоинт.
      }
    }
  },
}
