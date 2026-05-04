import { buildApiUrl } from '../../config/api'
import type {
  ExchangeOrderPayload,
  HouseholdCatalogItem,
  HouseholdOrderPayload,
  HouseholdOrderResponse,
  HouseholdOrderResult,
} from './types'

export class HouseholdApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const ENDPOINT_ATTEMPTS = [
  '/employees/{employeeId}/household-orders',
  '/employees/{employeeId}/household_orders',
  '/employees/{employeeId}/household/report',
  '/api/employees/{employeeId}/household-orders',
  '/api/employees/{employeeId}/household_orders',
  '/api/employees/{employeeId}/household/report',
] as const

const CATALOG_ENDPOINT_ATTEMPTS = [
  '/employees/{employeeId}/household-goods/items',
  '/employees/{employeeId}/household_goods/items',
  '/employees/{employeeId}/household/items',
  '/employees/{employeeId}/household-goods/context',
  '/api/employees/{employeeId}/household-goods/items',
  '/api/employees/{employeeId}/household_goods/items',
  '/api/employees/{employeeId}/household/items',
  '/api/employees/{employeeId}/household-goods/context',
] as const

const EXCHANGE_ENDPOINT_ATTEMPTS = [
  '/employees/{employeeId}/cash-exchange-orders',
  '/employees/{employeeId}/cash_exchange_orders',
  '/employees/{employeeId}/cash-exchange',
  '/employees/{employeeId}/cash_exchange',
  '/employees/{employeeId}/cash-exchange/report',
  '/employees/{employeeId}/cash_exchange/report',
  '/employees/{employeeId}/exchange-orders',
  '/employees/{employeeId}/exchange_orders',
  '/employees/{employeeId}/exchange-order',
  '/employees/{employeeId}/exchange_order',
  '/employees/{employeeId}/exchange',
  '/employees/{employeeId}/exchange/report',
  '/api/employees/{employeeId}/cash-exchange-orders',
  '/api/employees/{employeeId}/cash_exchange_orders',
  '/api/employees/{employeeId}/cash-exchange',
  '/api/employees/{employeeId}/cash_exchange',
  '/api/employees/{employeeId}/cash-exchange/report',
  '/api/employees/{employeeId}/cash_exchange/report',
  '/api/employees/{employeeId}/exchange-orders',
  '/api/employees/{employeeId}/exchange_orders',
  '/api/employees/{employeeId}/exchange-order',
  '/api/employees/{employeeId}/exchange_order',
  '/api/employees/{employeeId}/exchange',
  '/api/employees/{employeeId}/exchange/report',
] as const

function endpointFor(employeeId: string, template: string) {
  return template.replace('{employeeId}', encodeURIComponent(employeeId))
}

function normalize(data: HouseholdOrderResponse | null | undefined): HouseholdOrderResult {
  return {
    id:
      typeof data?.id === 'number'
        ? data.id
        : typeof data?.order_id === 'number'
          ? data.order_id
          : null,
    createdAt: data?.createdAt ?? data?.created_at ?? null,
  }
}

function normalizeCatalog(data: unknown): HouseholdCatalogItem[] {
  const asObject = (data && typeof data === 'object' ? data : null) as
    | { items?: unknown }
    | null

  const rawItems = Array.isArray(asObject?.items)
    ? asObject?.items
    : Array.isArray(data)
      ? data
      : []

  return rawItems
    .map(item => {
      const row = (item && typeof item === 'object' ? item : null) as
        | { id?: unknown; item_name?: unknown; name?: unknown }
        | null

      const id = Number(row?.id)
      const name =
        typeof row?.item_name === 'string'
          ? row.item_name.trim()
          : typeof row?.name === 'string'
            ? row.name.trim()
            : ''

      if (!Number.isInteger(id) || id <= 0 || !name) {
        return null
      }

      return { id, name }
    })
    .filter((item): item is HouseholdCatalogItem => item !== null)
}

function getErrorMessage(status: number, code?: string) {
  if (code === 'invalid_employee_id') {
    return 'Некорректный сотрудник'
  }
  if (code === 'employee_not_found') {
    return 'Сотрудник не найден'
  }
  if (code === 'shop_required' || code === 'shop_name_required') {
    return 'Укажите магазин'
  }
  if (code === 'items_required' || code === 'invalid_items') {
    return 'Добавьте позиции в заявку'
  }
  if (code === 'invalid_urgency') {
    return 'Выберите корректную срочность для размена'
  }
  if (code === 'manager_not_found') {
    return 'Не найден управляющий для региона'
  }
  if (code === 'shop_not_found_for_region' || code === 'shop_not_found_for_employee') {
    return 'Магазин не найден для выбранного сотрудника/региона'
  }
  if (status === 404) {
    return 'API хозтоваров пока не подключено на сервере'
  }
  if (status === 403) {
    return 'Для этого аккаунта отправка недоступна'
  }
  return 'Не удалось отправить заявку по хозтоварам'
}

async function requestJson(path: string, init?: RequestInit): Promise<HouseholdOrderResult> {
  const res = await fetch(buildApiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error
    throw new HouseholdApiError(getErrorMessage(res.status, code), res.status, code)
  }

  return normalize(data as HouseholdOrderResponse | null)
}

async function requestCatalog(path: string): Promise<HouseholdCatalogItem[]> {
  const res = await requestRaw(path, { method: 'GET' })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error
    throw new HouseholdApiError(getErrorMessage(res.status, code), res.status, code)
  }

  return normalizeCatalog(data)
}

async function requestRaw(path: string, init?: RequestInit): Promise<Response> {
  return fetch(buildApiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

export const householdApi = {
  async probe(employeeId: string): Promise<'connected' | 'disconnected'> {
    for (const template of ENDPOINT_ATTEMPTS) {
      const path = endpointFor(employeeId, template)
      try {
        const res = await requestRaw(path, {
          method: 'POST',
          body: JSON.stringify({}),
        })
        if (res.status !== 404) {
          return 'connected'
        }
      } catch {
        // ignored, try next endpoint
      }
    }
    return 'disconnected'
  },

  async submit(employeeId: string, payload: HouseholdOrderPayload): Promise<HouseholdOrderResult> {
    const body = JSON.stringify(payload)
    let lastError: unknown = null
    const tried: string[] = []

    for (const template of ENDPOINT_ATTEMPTS) {
      const path = endpointFor(employeeId, template)
      tried.push(path)
      try {
        return await requestJson(path, {
          method: 'POST',
          body,
        })
      } catch (error) {
        lastError = error
        if (!(error instanceof HouseholdApiError) || error.status !== 404) {
          throw error
        }
      }
    }

    if (lastError instanceof HouseholdApiError && lastError.status === 404) {
      throw new HouseholdApiError(
        'API хозтоваров не найдено по маршрутам: ' + tried.join(', '),
        404,
        'household_api_not_found',
      )
    }

    throw lastError instanceof Error ? lastError : new HouseholdApiError('Не удалось отправить заявку по хозтоварам')
  },

  async getCatalog(employeeId: string): Promise<HouseholdCatalogItem[]> {
    let lastError: unknown = null

    for (const template of CATALOG_ENDPOINT_ATTEMPTS) {
      const path = endpointFor(employeeId, template)
      try {
        const items = await requestCatalog(path)
        if (items.length > 0) {
          return items
        }
      } catch (error) {
        lastError = error
        if (!(error instanceof HouseholdApiError) || error.status !== 404) {
          throw error
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError
    }

    return []
  },

  async probeExchange(employeeId: string): Promise<'connected' | 'disconnected'> {
    for (const template of EXCHANGE_ENDPOINT_ATTEMPTS) {
      const path = endpointFor(employeeId, template)
      try {
        const res = await requestRaw(path, {
          method: 'POST',
          body: JSON.stringify({}),
        })
        if (res.status !== 404) {
          return 'connected'
        }
      } catch {
        // ignored, try next endpoint
      }
    }
    return 'disconnected'
  },

  async submitExchange(
    employeeId: string,
    payload: ExchangeOrderPayload,
  ): Promise<HouseholdOrderResult> {
    const body = JSON.stringify(payload)
    let lastError: unknown = null
    const tried: string[] = []

    for (const template of EXCHANGE_ENDPOINT_ATTEMPTS) {
      const path = endpointFor(employeeId, template)
      tried.push(path)
      try {
        return await requestJson(path, {
          method: 'POST',
          body,
        })
      } catch (error) {
        lastError = error
        if (!(error instanceof HouseholdApiError) || error.status !== 404) {
          throw error
        }
      }
    }

    if (lastError instanceof HouseholdApiError && lastError.status === 404) {
      throw new HouseholdApiError(
        'API размена не найдено по маршрутам: ' + tried.join(', '),
        404,
        'exchange_api_not_found',
      )
    }

    throw lastError instanceof Error ? lastError : new HouseholdApiError('Не удалось отправить заявку на размен')
  },
}
