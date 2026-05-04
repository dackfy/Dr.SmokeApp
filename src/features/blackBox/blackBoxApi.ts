import { buildApiUrl } from '../../config/api'
import type {
  BlackBoxReportPayload,
  BlackBoxReportResponse,
  BlackBoxReportResult,
} from './types'

export class BlackBoxApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function normalizeReport(
  data: BlackBoxReportResponse | null | undefined,
): BlackBoxReportResult {
  return {
    createdAt: data?.createdAt ?? data?.created_at ?? null,
  }
}

function getErrorMessage(status: number, code?: string) {
  if (code === 'message_required' || code === 'reason_required') {
    return 'Сообщение не может быть пустым'
  }
  if (code === 'employee_not_registered') {
    return 'Сотрудник не зарегистрирован'
  }
  if (code === 'employee_inactive') {
    return 'Аккаунт сотрудника деактивирован'
  }
  if (status === 404) {
    return 'API чёрного ящика пока не подключено на сервере'
  }
  if (status === 403) {
    return 'Для этого аккаунта отправка недоступна'
  }
  return 'Не удалось отправить сообщение в чёрный ящик'
}

async function requestJson(path: string, init?: RequestInit): Promise<BlackBoxReportResult> {
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
    throw new BlackBoxApiError(getErrorMessage(res.status, code), res.status, code)
  }

  return normalizeReport(data as BlackBoxReportResponse | null)
}

export const blackBoxApi = {
  async report(employeeId: string, payload: BlackBoxReportPayload): Promise<BlackBoxReportResult> {
    const body = JSON.stringify(payload)

    try {
      return await requestJson(
        `/employees/${encodeURIComponent(employeeId)}/black-box/report`,
        {
          method: 'POST',
          body,
        },
      )
    } catch (error) {
      if (!(error instanceof BlackBoxApiError) || error.status !== 404) {
        throw error
      }
    }

    try {
      return await requestJson(
        `/employees/${encodeURIComponent(employeeId)}/black-box`,
        {
          method: 'POST',
          body,
        },
      )
    } catch (error) {
      if (!(error instanceof BlackBoxApiError) || error.status !== 404) {
        throw error
      }
    }

    return requestJson(
      `/employees/${encodeURIComponent(employeeId)}/black_box`,
      {
        method: 'POST',
        body,
      },
    )
  },
}
