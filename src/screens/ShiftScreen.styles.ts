import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 14,
  },

  card: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },

  greetingBlock: {
    paddingHorizontal: 4,
    gap: 10,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },

  headerRow: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  headerAvatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1F2838',
    borderWidth: 1,
    borderColor: '#3E4D68',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  subtitle: {
    color: '#B6B6B6',
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  badgeOpen: {
    alignSelf: 'flex-start',
    backgroundColor: '#194B2A',
    borderColor: '#216C3A',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeClosed: {
    alignSelf: 'flex-start',
    backgroundColor: '#2D2222',
    borderColor: '#5C3131',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  rowButton: {
    flex: 1,
  },

  button: {
    backgroundColor: '#FF6A00',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },

  buttonSecondary: {
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },

  buttonDanger: {
    backgroundColor: '#B41F1F',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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

  smallText: {
    color: '#A9A9A9',
    fontSize: 12,
    lineHeight: 18,
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
