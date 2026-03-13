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
  openShift(userId: string, payload: OpenShiftPayload): Promise<ShiftStatus>
  closeShift(userId: string, payload: CloseShiftPayload): Promise<ShiftStatus>
  resetOpenedShift(userId: string): Promise<ShiftStatus>
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
}

type OpenShiftResponse = {
  message?: string
  shop_id?: number
  shop_name?: string
  report_date?: string
  open_time?: string
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
    }
  },

  async getAvailableShops(_userId) {
    await wait(220)
    return []
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
    }
  },

  async closeShift(userId, payload) {
    await wait(500)

    if (!openShiftByUser.has(userId)) {
      throw new Error('Открытая смена не найдена.')
    }

    if (payload.revenueTotal <= 0 || payload.averageCheck <= 0) {
      throw new Error('Проверьте выручку и средний чек перед отправкой отчета.')
    }

    openShiftByUser.delete(userId)

    return {
      openedShift: null,
    }
  },

  async resetOpenedShift(userId) {
    await wait(300)
    openShiftByUser.delete(userId)

    return {
      openedShift: null,
    }
  },
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
      return { openedShift: null }
    }

    const openedAt =
      data.report_date && data.open_time
        ? `${data.report_date} ${data.open_time}`
        : new Date().toISOString()

    const openedShift: OpenedShift = {
      shopId: data.shop_id ?? undefined,
      shopName: data.shop_name?.trim() || 'Магазин не указан',
      openedAt,
      cashAtOpening: Number(data.cash_at_opening ?? 0),
    }

    return { openedShift }
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
  async openShift(userId, payload) {
    const res = await fetch(buildApiUrl('/shifts/open'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: Number(userId),
        shop_id: payload.shopId,
        cash_at_opening: payload.cashAtOpening,
      }),
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
      if (res.status === 404 && code === 'shop_not_found') {
        throw new Error('Магазин не найден.')
      }
      throw new Error('Не удалось открыть смену.')
    }

    const openedAt =
      data?.report_date && data?.open_time
        ? `${data.report_date} ${data.open_time}`
        : new Date().toISOString()

    const openedShift: OpenedShift = {
      shopId: data?.shop_id ?? payload.shopId,
      shopName: data?.shop_name ?? payload.shopName,
      openedAt,
      cashAtOpening: payload.cashAtOpening,
    }

    openShiftByUser.set(userId, openedShift)

    return { openedShift }
  },
}
