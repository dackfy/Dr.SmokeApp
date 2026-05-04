import { buildApiUrl } from '../../config/api'

export type DovozAction = 'start' | 'arrive' | 'finish'

type DovozActionResult = {
  success: boolean
  message: string
}

const ACTION_PATHS: Record<DovozAction, string[]> = {
  start: [
    '/employees/{employeeId}/dovoz/start',
    '/employees/{employeeId}/delivery-runs/start',
    '/employees/{employeeId}/deliveries/start',
    '/employees/{employeeId}/dovoz',
    '/api/employees/{employeeId}/dovoz/start',
    '/api/employees/{employeeId}/delivery-runs/start',
    '/api/employees/{employeeId}/deliveries/start',
    '/api/employees/{employeeId}/dovoz',
  ],
  arrive: [
    '/employees/{employeeId}/dovoz/arrive',
    '/employees/{employeeId}/delivery-runs/arrive',
    '/employees/{employeeId}/deliveries/arrive',
    '/employees/{employeeId}/dovoz',
    '/api/employees/{employeeId}/dovoz/arrive',
    '/api/employees/{employeeId}/delivery-runs/arrive',
    '/api/employees/{employeeId}/deliveries/arrive',
    '/api/employees/{employeeId}/dovoz',
  ],
  finish: [
    '/employees/{employeeId}/dovoz/finish',
    '/employees/{employeeId}/delivery-runs/finish',
    '/employees/{employeeId}/deliveries/finish',
    '/employees/{employeeId}/dovoz',
    '/api/employees/{employeeId}/dovoz/finish',
    '/api/employees/{employeeId}/delivery-runs/finish',
    '/api/employees/{employeeId}/deliveries/finish',
    '/api/employees/{employeeId}/dovoz',
  ],
}

function fillPath(path: string, employeeId: number | string) {
  return path.replace('{employeeId}', encodeURIComponent(String(employeeId)))
}

async function parseMessage(response: Response) {
  try {
    const data = (await response.json()) as
      | { message?: string; error?: string }
      | undefined
    if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim()
    if (typeof data?.error === 'string' && data.error.trim()) return data.error.trim()
  } catch {
    // ignore JSON parse
  }

  return `HTTP ${response.status}`
}

async function postOne(path: string, action: DovozAction) {
  return fetch(buildApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

async function sendAction(employeeId: number | string, action: DovozAction): Promise<DovozActionResult> {
  const tried: string[] = []
  const paths = ACTION_PATHS[action]

  for (const pattern of paths) {
    const path = fillPath(pattern, employeeId)
    tried.push(path)

    try {
      const response = await postOne(path, action)

      if (response.status === 404) {
        continue
      }

      if (!response.ok) {
        return {
          success: false,
          message: await parseMessage(response),
        }
      }

      return {
        success: true,
        message:
          action === 'start'
            ? 'Статус довоза обновлён: выезд отмечен.'
            : action === 'arrive'
            ? 'Статус довоза обновлён: прибытие отмечено.'
            : 'Статус довоза обновлён: довоз завершён.',
      }
    } catch {
      continue
    }
  }

  return {
    success: false,
    message: `API довозов не найдено по маршрутам: ${tried.join(', ')}`,
  }
}

export const dovozApi = {
  start(employeeId: number | string) {
    return sendAction(employeeId, 'start')
  },
  arrive(employeeId: number | string) {
    return sendAction(employeeId, 'arrive')
  },
  finish(employeeId: number | string) {
    return sendAction(employeeId, 'finish')
  },
}
