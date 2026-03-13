import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  authenticatedScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },

  authContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  profileContent: {
    width: '100%',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingBottom: 100,
  },

  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  authScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 24,
    textAlign: 'center',
  },

  welcomeCard: {
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    alignItems: 'center',
    gap: 10,
  },

  profileForm: {
    width: '100%',
  },

  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },

  welcomeSubtitle: {
    color: '#B3B3B3',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },

  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#151515',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },

  modeButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#242424',
  },

  modeButtonText: {
    color: '#A8A8A8',
    fontWeight: '600',
    fontSize: 14,
  },

  modeButtonTextActive: {
    color: '#FFFFFF',
  },

  formCard: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
  },

  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2B2B2B',
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },

  inputFocused: {
    borderColor: '#FF6A00',
    borderWidth: 1,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 4,
  },

  profileInput: {
    width: '100%',
  },

  passwordField: {
    position: 'relative',
  },

  passwordInput: {
    paddingRight: 48,
  },

  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
  },

  eyeImage: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
    opacity: 0.9,
  },

  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginBottom: 12,
  },

  successTextInline: {
    color: '#B7F3C8',
    fontSize: 13,
    marginBottom: 12,
  },

  authNoticeBox: {
    backgroundColor: '#194B2A',
    borderColor: '#216C3A',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  authNoticeText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },

  successBox: {
    backgroundColor: '#102718',
    borderWidth: 1,
    borderColor: '#1E5B31',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  successText: {
    color: '#B7F3C8',
    fontSize: 13,
    marginBottom: 10,
  },

  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#1E5B31',
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  button: {
    backgroundColor: '#FF6A00',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 20,

    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  logoutButton: {
    width: '100%',
    marginBottom: 0,
  },

  logoutSmallButton: {
    alignSelf: 'center',
    backgroundColor: '#FF6A00',
    borderWidth: 1,
    borderColor: '#FF6A00',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 8,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 4,
  },

  logoutSmallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  linkButton: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },

  linkButtonText: {
    color: '#FF6A00',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
