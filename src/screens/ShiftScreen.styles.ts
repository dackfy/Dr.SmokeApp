import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070707',
  },

  content: {
    padding: 20,
    paddingBottom: 32,
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

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
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
    gap: 8,
  },

  button: {
    backgroundColor: '#FF6A00',
    borderRadius: 12,
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

  shopButton: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },

  shopButtonActive: {
    borderColor: '#FF6A00',
    backgroundColor: '#312114',
  },

  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
})
