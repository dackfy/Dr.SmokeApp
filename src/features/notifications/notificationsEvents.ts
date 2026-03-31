type NotificationsUnreadCountListener = (payload: {
  employeeId: string
  unreadCount: number
}) => void

const unreadCountListeners = new Set<NotificationsUnreadCountListener>()

export function emitNotificationsUnreadCountChanged(payload: {
  employeeId: string
  unreadCount: number
}) {
  unreadCountListeners.forEach(listener => {
    listener(payload)
  })
}

export function subscribeToNotificationsUnreadCount(
  listener: NotificationsUnreadCountListener,
) {
  unreadCountListeners.add(listener)

  return () => {
    unreadCountListeners.delete(listener)
  }
}
