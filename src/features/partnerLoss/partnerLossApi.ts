import { buildApiUrl } from '../../config/api'
import type {
  PartnerLossReportPayload,
  PartnerLossReportResponse,
  PartnerLossReportResult,
} from './types'

export interface PartnerLossApi {
  report(employeeId: string, payload: PartnerLossReportPayload): Promise<PartnerLossReportResult>
}

export class PartnerLossApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function normalizeReport(
  data: PartnerLossReportResponse | null | undefined,
): PartnerLossReportResult {
  return {
    createdAt: data?.createdAt ?? data?.created_at ?? null,
    shopName: data?.shopName ?? data?.shop_name ?? null,
  }
}

function getErrorMessage(status: number, code?: string) {
  if (code === 'shift_not_open' || code === 'opened_shop_not_found') {
    return 'Сообщить о потере партнёра можно только при открытой смене'
  }
  if (code === 'reason_required') {
    return 'Нужно коротко указать причину потери партнёра'
  }
  if (code === 'employee_not_registered') {
    return 'Сотрудник не зарегистрирован'
  }
  if (code === 'employee_inactive') {
    return 'Аккаунт сотрудника деактивирован'
  }
  if (status === 404) {
    return 'API потери партнёра пока не подключено на сервере'
  }
  if (status === 403) {
    return 'Для этого аккаунта отправка отчёта недоступна'
  }
  return 'Не удалось отправить отчёт о потере партнёра'
}

async function requestJson(
  path: string,
  init?: RequestInit,
): Promise<PartnerLossReportResult> {
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
    throw new PartnerLossApiError(getErrorMessage(res.status, code), res.status, code)
  }

  return normalizeReport(data as PartnerLossReportResponse | null)
}

export const partnerLossApi: PartnerLossApi = {
  async report(employeeId, payload) {
    try {
      return await requestJson(
        `/employees/${encodeURIComponent(employeeId)}/partner-loss/report`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    } catch (error) {
      if (!(error instanceof PartnerLossApiError) || error.status !== 404) {
        throw error
      }

      return requestJson(
        `/employees/${encodeURIComponent(employeeId)}/partner-loss`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    }
  },
}
