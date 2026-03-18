import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  authenticatedScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },

  homeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  tabLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  iosComingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  authContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  comingSoonWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 16,
  },

  comingSoonIcon: {
    width: 68,
    height: 68,
    resizeMode: 'contain',
    tintColor: '#A9A9A9',
  },

  comingSoonText: {
    color: '#A9A9A9',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
  },

  profileContent: {
    width: '100%',
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
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2B2B2B',
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
    fontVariant: ['tabular-nums'],
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

  profileEyeImage: {
    tintColor: '#3A3A3C',
    opacity: 0.92,
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

  flashMessage: {
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

  flashMessageError: {
    backgroundColor: '#5A140E',
    borderColor: '#8A241A',
  },

  flashMessageSuccess: {
    backgroundColor: '#0D5A45',
    borderColor: '#128765',
  },

  flashMessageLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  flashIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flashIconCircleError: {
    backgroundColor: '#BE3A2B',
  },

  flashIconCircleSuccess: {
    backgroundColor: '#16A079',
  },

  flashIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },

  flashMessageText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },

  flashCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  flashCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },

  forgotFlashSlot: {
    minHeight: 0,
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

  profileSheetRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    elevation: 120,
  },

  profileSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },

  profileSheetCard: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 10,
    bottom: 8,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 18,
  },

  profileSheetSafeArea: {
    flex: 1,
  },

  profileSheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 8,
    gap: 14,
  },

  profileAccountCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  profileAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  profileAvatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7E8BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  profileIdentityBlock: {
    flex: 1,
    justifyContent: 'center',
  },

  profileAccountName: {
    color: '#F2F2F7',
    fontSize: 20,
    fontWeight: '700',
  },

  profileAccountEmail: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },

  profileActionsCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    overflow: 'hidden',
  },

  profileRowButton: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  profileRowButtonText: {
    color: '#F2F2F7',
    fontSize: 17,
    fontWeight: '600',
  },

  profileRowStatic: {
    minHeight: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },

  profileRowMutedText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },

  profileRowDangerText: {
    color: '#FF6A00',
    fontSize: 17,
    fontWeight: '600',
  },

  profileRowChevron: {
    color: '#FF6A00',
    fontSize: 28,
    lineHeight: 28,
  },

  profileDivider: {
    height: 1,
    marginLeft: 16,
    backgroundColor: '#3A3A3C',
  },

  profilePasswordCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    padding: 14,
  },

  profileBottomBlock: {
    marginTop: 'auto',
    backgroundColor: '#2C2C2E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    padding: 4,
    marginBottom: 2,
  },

  profileLogoutButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  profileLogoutButtonText: {
    color: '#FF6A00',
    fontSize: 17,
    fontWeight: '700',
  },

  profileSheetCloseButton: {
    position: 'absolute',
    right: 14,
    top: 8,
    zIndex: 3,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3C',
    borderWidth: 1,
    borderColor: '#545458',
  },

  profileSheetCloseIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: '#F2F2F7',
  },

  androidThemeSection: {
    minHeight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },

  androidThemeTitle: {
    fontSize: 22,
    marginBottom: 8,
    fontWeight: '800',
  },

  androidThemeSubtitle: {
    marginBottom: 16,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },

  androidThemeCardList: {
    gap: 12,
  },

  androidThemeCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },

  androidThemeCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  androidThemeBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  androidThemeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  androidThemeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },

  androidThemeCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },

  androidThemeCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    flexShrink: 1,
  },

  androidThemeCardMeta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  androidThemeCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },

  androidThemePreviewRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    height: 56,
  },

  androidThemePreviewCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },

  androidThemePreviewTall: {
    width: 22,
    borderRadius: 14,
  },

  androidThemePreviewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  androidThemePreviewLine: {
    height: 7,
    borderRadius: 999,
    width: '92%',
  },

  androidThemePreviewLineShort: {
    height: 6,
    borderRadius: 999,
    width: '58%',
  },

  tabHeaderContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  tabHeaderContainerIosOnly: {
    paddingTop: 32,
  },

  tabHeaderRow: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  tabHeaderRowIosOnly: {
    justifyContent: 'flex-end',
  },

  tabHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  tabHeaderAvatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7E8BFF',
    borderWidth: 1,
    borderColor: '#7E8BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabHeaderAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  iosFloatingHeaderWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  iosFloatingHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  iosFloatingHeaderRow: {
    minHeight: 56,
  },

  profileTitleWrap: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  profileTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
