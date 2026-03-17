import { Platform, StyleSheet } from 'react-native'

const isAndroid = Platform.OS === 'android'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isAndroid ? '#121A2A' : '#000000',
  },

  content: {
    padding: isAndroid ? 18 : 20,
    paddingTop: isAndroid ? 14 : 20,
    paddingBottom: isAndroid ? 132 : 120,
    gap: isAndroid ? 16 : 14,
  },

  card: {
    backgroundColor: isAndroid ? '#1E2636' : '#111111',
    borderWidth: 1,
    borderColor: isAndroid ? '#33405A' : '#1F1F1F',
    borderRadius: isAndroid ? 30 : 16,
    padding: isAndroid ? 20 : 16,
    gap: isAndroid ? 12 : 10,
  },

  greetingBlock: {
    paddingHorizontal: 4,
    gap: isAndroid ? 12 : 10,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },

  headerRow: {
    paddingHorizontal: isAndroid ? 2 : 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isAndroid ? 2 : 4,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  headerBalanceBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  headerBalanceCaption: {
    color: '#A9A9A9',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 26,
  },

  headerBalanceValue: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 38,
    marginTop: 0,
  },

  balanceFlashCard: {
    flex: 1,
    backgroundColor: isAndroid ? '#1E2636' : '#111111',
    borderWidth: 1,
    borderColor: isAndroid ? '#33405A' : '#1F1F1F',
    borderRadius: isAndroid ? 28 : 26,
    paddingHorizontal: isAndroid ? 16 : 12,
    paddingVertical: isAndroid ? 14 : 10,
    marginRight: 10,
  },

  balanceFlashCardActive: {
    borderColor: isAndroid ? '#4A8BFF' : '#FF6A00',
    shadowColor: isAndroid ? '#4A8BFF' : '#FF6A00',
    shadowOpacity: isAndroid ? 0.18 : 0.26,
    shadowRadius: isAndroid ? 16 : 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },

  balanceFlashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  balanceFlashIconCircle: {
    width: isAndroid ? 42 : 36,
    height: isAndroid ? 42 : 36,
    borderRadius: isAndroid ? 21 : 18,
    backgroundColor: isAndroid ? '#243048' : '#232323',
    borderWidth: 1,
    borderColor: isAndroid ? '#3B4C6D' : '#2D2D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceFlashIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  balanceFlashTextBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  balanceFlashCaption: {
    color: isAndroid ? '#97A6C4' : '#B6B6B6',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },

  balanceFlashValue: {
    color: '#FFFFFF',
    fontSize: isAndroid ? 24 : 22,
    fontWeight: '800',
    lineHeight: isAndroid ? 30 : 27,
  },

  balanceFlashChevron: {
    color: '#CFCFCF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    marginLeft: 8,
  },

  balanceFlashHistory: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: isAndroid ? '#33405A' : '#1F1F1F',
    paddingTop: 8,
    gap: 8,
  },

  balanceFlashHistoryWrap: {
    overflow: 'hidden',
  },

  balanceFlashMuted: {
    color: isAndroid ? '#97A6C4' : '#AFAFAF',
    fontSize: 13,
    lineHeight: 18,
  },

  balanceHistoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  balanceHistoryTextBlock: {
    flex: 1,
  },

  balanceHistoryReason: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },

  balanceHistoryDate: {
    color: isAndroid ? '#8D9AB4' : '#A5A5A5',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },

  balanceHistoryPoints: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 1,
  },

  headerAvatarButton: {
    width: isAndroid ? 48 : 38,
    height: isAndroid ? 48 : 38,
    borderRadius: isAndroid ? 24 : 19,
    backgroundColor: isAndroid ? '#243048' : '#7E8BFF',
    borderWidth: 1,
    borderColor: isAndroid ? '#3B4C6D' : '#7E8BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerAvatarText: {
    color: isAndroid ? '#AFC7FF' : '#FFFFFF',
    fontSize: isAndroid ? 18 : 16,
    fontWeight: '800',
  },

  scheduleSection: {
    gap: isAndroid ? 12 : 10,
  },

  scheduleSectionHeader: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  scheduleList: {
    paddingHorizontal: 4,
    gap: isAndroid ? 10 : 8,
    paddingRight: 12,
  },

  scheduleCard: {
    width: isAndroid ? 172 : 164,
    minHeight: 196,
    borderRadius: isAndroid ? 28 : 20,
    borderWidth: 1,
    borderColor: isAndroid ? '#33405A' : '#2B2B2B',
    backgroundColor: isAndroid ? '#1E2636' : '#161616',
    overflow: 'hidden',
  },

  scheduleCardTop: {
    backgroundColor: isAndroid ? '#2A3550' : '#FF6A00',
    paddingHorizontal: 14,
    paddingVertical: isAndroid ? 10 : 8,
  },

  scheduleCardHeader: {
    gap: 2,
  },

  scheduleCardBody: {
    paddingHorizontal: 14,
    paddingVertical: isAndroid ? 12 : 10,
    gap: 5,
  },

  scheduleCardMuted: {
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    backgroundColor: '#141414',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  scheduleDate: {
    color: '#FFFFFF',
    fontSize: isAndroid ? 22 : 24,
    fontWeight: '800',
    lineHeight: 28,
  },

  scheduleWeekday: {
    color: isAndroid ? '#AFC7FF' : '#FFF2E6',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },

  scheduleTime: {
    color: isAndroid ? '#7DB2FF' : '#FF6A00',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },

  scheduleTimeSpacer: {
    height: 24,
  },

  scheduleShop: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 8,
  },

  scheduleAddress: {
    color: isAndroid ? '#97A6C4' : '#B8B8B8',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: 2,
  },

  scheduleDutyBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: isAndroid ? '#22314C' : '#2C1E12',
    borderWidth: 1,
    borderColor: isAndroid ? '#40557C' : '#664122',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  scheduleDutyText: {
    color: isAndroid ? '#AFC7FF' : '#FFD3A6',
    fontSize: 12,
    fontWeight: '700',
  },

  scheduleDutyValue: {
    color: isAndroid ? '#7DB2FF' : '#FF6A00',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 8,
  },

  subtitle: {
    color: isAndroid ? '#97A6C4' : '#B6B6B6',
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: isAndroid ? 22 : 18,
    fontWeight: isAndroid ? '800' : '700',
  },

  badgeOpen: {
    alignSelf: 'flex-start',
    backgroundColor: isAndroid ? '#243048' : '#194B2A',
    borderColor: isAndroid ? '#40557C' : '#216C3A',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: isAndroid ? 14 : 10,
    paddingVertical: isAndroid ? 7 : 4,
  },

  badgeClosed: {
    alignSelf: 'flex-start',
    backgroundColor: isAndroid ? '#312B31' : '#2D2222',
    borderColor: isAndroid ? '#524754' : '#5C3131',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: isAndroid ? 14 : 10,
    paddingVertical: isAndroid ? 7 : 4,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: isAndroid ? '800' : '600',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  rowButton: {
    flex: 1,
  },

  button: {
    backgroundColor: isAndroid ? '#4A8BFF' : '#FF6A00',
    borderRadius: isAndroid ? 22 : 50,
    minHeight: isAndroid ? 52 : undefined,
    paddingVertical: isAndroid ? 13 : 12,
    paddingHorizontal: isAndroid ? 18 : 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonSecondary: {
    backgroundColor: isAndroid ? '#1E2636' : '#232323',
    borderWidth: 1,
    borderColor: isAndroid ? '#33405A' : '#2D2D2D',
  },

  buttonDanger: {
    backgroundColor: '#B41F1F',
  },

  buttonDisabled: {
    opacity: isAndroid ? 0.5 : 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: isAndroid ? '800' : '700',
  },

  stack: {
    gap: 10,
  },

  input: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },

  inputFocused: {
    borderColor: '#FF6A00',
    shadowColor: '#FF6A00',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  sealNumberBox: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#FF6A00',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  sealNumberValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  shopSelectTrigger: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  shopSelectTriggerActive: {
    borderColor: '#FF6A00',
  },

  shopSelectTriggerText: {
    color: '#8F8F8F',
    fontSize: 14,
  },

  shopSelectTriggerTextActive: {
    color: '#FFFFFF',
  },

  shopSelectChevron: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
  },

  shopStepContainer: {
    position: 'relative',
    zIndex: 10,
  },

  shopModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  shopModalCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 360,
  },

  shopModalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },

  shopDropdownScroll: {
    maxHeight: 300,
  },

  shopOptionRow: {
    minHeight: 50,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },

  shopOptionRowActive: {
    backgroundColor: '#2A1D12',
  },

  shopOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },

  shopOptionTextActive: {
    color: '#FFB273',
    fontWeight: '600',
  },

  shopEmptyWrap: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 10,
  },

  shopEmptyText: {
    color: '#A9A9A9',
    fontSize: 13,
    lineHeight: 18,
  },

  shopRefreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
  },

  alertError: {
    backgroundColor: '#331818',
    borderColor: '#6D2A2A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },

  alertNotice: {
    backgroundColor: '#173120',
    borderColor: '#28653C',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },

  alertText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },

  shiftFlashMessage: {
    minHeight: 56,
    borderRadius: 50,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  shiftFlashMessageSuccess: {
    backgroundColor: '#0D5A45',
    borderColor: '#128765',
  },

  shiftFlashMessageError: {
    backgroundColor: '#5A140E',
    borderColor: '#8A241A',
  },

  shiftFlashMessageLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  shiftFlashIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shiftFlashIconCircleSuccess: {
    backgroundColor: '#16A079',
  },

  shiftFlashIconCircleError: {
    backgroundColor: '#BE3A2B',
  },

  shiftFlashIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },

  shiftFlashMessageText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },

  shiftFlashCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shiftFlashCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },

  smallText: {
    color: isAndroid ? '#97A6C4' : '#A9A9A9',
    fontSize: 12,
    lineHeight: 18,
  },

  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  reviewEditButton: {
    borderWidth: 1,
    borderColor: '#2D2D2D',
    backgroundColor: '#1B1B1B',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  reviewEditButtonText: {
    color: '#FF6A00',
    fontSize: 12,
    fontWeight: '700',
  },

  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  keyboardAccessory: {
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },

  keyboardAccessoryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  keyboardAccessoryText: {
    color: '#FF6A00',
    fontSize: 16,
    fontWeight: '700',
  },

})
