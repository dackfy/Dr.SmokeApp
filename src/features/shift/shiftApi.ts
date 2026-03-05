import type { CloseShiftPayload, OpenShiftPayload, OpenedShift, ShiftStatus } from './types'

export interface ShiftApi {
  getShiftStatus(userId: string): Promise<ShiftStatus>
  getAvailableShops(userId: string, regionId?: number): Promise<string[]>
  openShift(userId: string, payload: OpenShiftPayload): Promise<ShiftStatus>
  closeShift(userId: string, payload: CloseShiftPayload): Promise<ShiftStatus>
  resetOpenedShift(userId: string): Promise<ShiftStatus>
}

const openShiftByUser = new Map<string, OpenedShift>()

const shopsByRegion: Record<number, string[]> = {
  1: ['DrSmoke Центр', 'DrSmoke Невский', 'DrSmoke Лофт'],
  2: ['DrSmoke Казань', 'DrSmoke Волга'],
  3: ['DrSmoke Екб', 'DrSmoke Урал'],
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

  async getAvailableShops(_userId, regionId) {
    await wait(220)

    if (!regionId) {
      return shopsByRegion[1]
    }

    return shopsByRegion[regionId] ?? shopsByRegion[1]
  },

  async openShift(userId, payload) {
    await wait(500)

    if (openShiftByUser.has(userId)) {
      throw new Error('Смена уже открыта. Сначала закройте текущую смену.')
    }

    openShiftByUser.set(userId, {
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

export const shiftApi: ShiftApi = mockShiftApi
