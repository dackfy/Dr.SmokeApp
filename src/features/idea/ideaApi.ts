import { buildApiUrl } from '../../config/api'
import type {
  IdeaReportPayload,
  IdeaReportResponse,
  IdeaReportResult,
} from './types'

export class IdeaApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function normalizeReport(
  data: IdeaReportResponse | null | undefined,
): IdeaReportResult {
  return {
    createdAt: data?.createdAt ?? data?.created_at ?? null,
  }
}

function getErrorMessage(status: number, code?: string) {
  if (code === 'message_required' || code === 'idea_required') {
    return 'Текст идеи не может быть пустым'
  }
  if (code === 'employee_not_registered') {
    return 'Сотрудник не зарегистрирован'
  }
  if (code === 'employee_inactive') {
    return 'Аккаунт сотрудника деактивирован'
  }
  if (status === 404) {
    return 'API «У меня есть идея» пока не подключено на сервере'
  }
  if (status === 403) {
    return 'Для этого аккаунта отправка недоступна'
  }
  return 'Не удалось отправить идею'
}

async function requestJson(path: string, init?: RequestInit): Promise<IdeaReportResult> {
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
    throw new IdeaApiError(getErrorMessage(res.status, code), res.status, code)
  }

  return normalizeReport(data as IdeaReportResponse | null)
}

export const ideaApi = {
  async report(employeeId: string, payload: IdeaReportPayload): Promise<IdeaReportResult> {
    const body = JSON.stringify(payload)
    const encoded = encodeURIComponent(employeeId)

    const attempts = [
      `/employees/${encoded}/ideas/report`,
      `/employees/${encoded}/idea/report`,
      `/employees/${encoded}/ideas`,
      `/employees/${encoded}/idea`,
    ]

    let lastError: unknown = null
    for (const path of attempts) {
      try {
        return await requestJson(path, {
          method: 'POST',
          body,
        })
      } catch (error) {
        lastError = error
        if (!(error instanceof IdeaApiError) || error.status !== 404) {
          throw error
        }
      }
    }

    throw lastError instanceof Error ? lastError : new IdeaApiError('API «У меня есть идея» пока не подключено на сервере')
  },
}
