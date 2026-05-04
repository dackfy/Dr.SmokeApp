import { buildApiUrl } from '../../config/api'

export type TaskItem = {
  id: string
  description: string
  status: 'open' | 'closed'
  dueDate: string | null
  dueDays: number | null
  assignedToName: string | null
  assignedByName: string | null
  createdAt: string | null
  hasPhoto: boolean
}

export type TasksPayload = {
  assignedToMe: TaskItem[]
  assignedByMe: TaskItem[]
}

export class TasksApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeTask(raw: Record<string, unknown> | null | undefined): TaskItem {
  const id = String(
    raw?.id ??
      raw?.task_id ??
      raw?.taskId ??
      raw?.uuid ??
      `${raw?.task_description ?? raw?.description ?? 'task'}`,
  )

  const statusRaw = String(raw?.status ?? '').toLowerCase()
  const isClosed =
    statusRaw === 'closed' ||
    statusRaw === 'done' ||
    statusRaw === 'completed' ||
    Number(raw?.is_closed ?? 0) === 1

  return {
    id,
    description: String(raw?.task_description ?? raw?.description ?? raw?.task ?? 'Без описания'),
    status: isClosed ? 'closed' : 'open',
    dueDate: raw?.due_date ? String(raw.due_date) : raw?.deadline ? String(raw.deadline) : null,
    dueDays:
      typeof raw?.due_days === 'number'
        ? raw.due_days
        : typeof raw?.dueDays === 'number'
          ? raw.dueDays
          : null,
    assignedToName: raw?.assigned_to_name
      ? String(raw.assigned_to_name)
      : raw?.employee_name
        ? String(raw.employee_name)
        : null,
    assignedByName: raw?.assigned_by_name
      ? String(raw.assigned_by_name)
      : raw?.assigner_name
        ? String(raw.assigner_name)
        : raw?.creator_name
          ? String(raw.creator_name)
          : null,
    createdAt: raw?.created_at ? String(raw.created_at) : raw?.createdAt ? String(raw.createdAt) : null,
    hasPhoto: Boolean(raw?.photo_file_id ?? raw?.photo_url ?? raw?.photo),
  }
}

function normalizePayload(data: unknown): TasksPayload {
  const root = (data ?? {}) as Record<string, unknown>

  const assignedToMeSource =
    root.assigned_to_me ??
    root.tasks_assigned_to_employee ??
    root.assignedToMe ??
    root.received ??
    root.to_me
  const assignedByMeSource =
    root.assigned_by_me ??
    root.tasks_assigned_by_employee ??
    root.assignedByMe ??
    root.created ??
    root.by_me

  if (Array.isArray(data)) {
    return {
      assignedToMe: asArray<Record<string, unknown>>(data).map(normalizeTask),
      assignedByMe: [],
    }
  }

  return {
    assignedToMe: asArray<Record<string, unknown>>(assignedToMeSource).map(normalizeTask),
    assignedByMe: asArray<Record<string, unknown>>(assignedByMeSource).map(normalizeTask),
  }
}

async function requestTasks(path: string): Promise<TasksPayload> {
  const response = await fetch(buildApiUrl(path))

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const code = (data as { error?: string } | null)?.error
    throw new TasksApiError('Не удалось загрузить задачи', response.status, code)
  }

  return normalizePayload(data)
}

export const tasksApi = {
  async list(employeeId: string): Promise<TasksPayload> {
    const encoded = encodeURIComponent(employeeId)
    const attempts = [
      `/employees/${encoded}/tasks`,
      `/employees/${encoded}/tasks/list`,
      `/employees/${encoded}/set-tasks`,
    ]

    let lastError: unknown = null
    for (const path of attempts) {
      try {
        return await requestTasks(path)
      } catch (error) {
        lastError = error
        if (!(error instanceof TasksApiError) || error.status !== 404) {
          throw error
        }
      }
    }

    throw lastError instanceof Error ? lastError : new TasksApiError('API задач пока не подключено')
  },
}

