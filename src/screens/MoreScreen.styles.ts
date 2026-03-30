import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
  },

  staticScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  staticContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
  },

  staticContentWrap: {
    flex: 1,
    justifyContent: 'center',
  },

  staticTopContentWrap: {
    flex: 1,
    justifyContent: 'flex-start',
  },

  portalStaticContent: {
    flex: 1,
    gap: 12,
    paddingBottom: 112,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  title: {
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },

  sectionCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },

  appearanceSectionCard: {
    gap: 12,
  },

  appearanceOptionList: {
    gap: 16,
  },

  appearanceIntro: {
    gap: 10,
  },

  appearanceIntroBar: {
    width: 64,
    height: 6,
    borderRadius: 999,
  },

  appearanceIntroKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.38,
    textTransform: 'uppercase',
  },

  appearanceIntroText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  appearanceNoteCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },

  appearanceNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  appearanceNoteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  appearanceNoteLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.32,
    textTransform: 'uppercase',
  },

  appearanceNoteText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'center',
  },

  preferencesCard: {
    gap: 14,
  },

  preferencesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  preferencesHeaderText: {
    flex: 1,
    gap: 4,
  },

  preferencesSummary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  preferencesChevron: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '800',
  },

  preferencesPanel: {
    gap: 14,
    paddingTop: 4,
  },

  preferencesRow: {
    gap: 10,
  },

  preferencesLabelWrap: {
    gap: 4,
  },

  preferencesTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },

  preferencesSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },

  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  segmentButtonActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },

  segmentButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },

  heroCard: {
    gap: 10,
    marginBottom: 14,
  },

  rootLinksCard: {
    marginTop: 14,
  },

  heroAccentBar: {
    width: 72,
    height: 6,
    borderRadius: 999,
  },

  heroGlowCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },

  heroKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },

  rowList: {
    gap: 10,
  },

  heroInfoGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  heroInfoCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },

  heroInfoLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },

  heroInfoValue: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
  },

  navRow: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },

  navRowTextWrap: {
    flex: 1,
    gap: 2,
  },

  navRowBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  navRowBadgeText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '800',
  },

  navRowTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },

  navRowMeta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  navRowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  navChevron: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  headerTextWrap: {
    flex: 1,
    gap: 2,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  backButtonText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  screenTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },

  statusPill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  portalLinkCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },

  portalHeroGrid: {
    gap: 12,
  },

  portalStatRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },

  portalStatCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },

  portalStatValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },

  portalStatLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },

  portalLinkLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },

  portalLinkValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },

  portalCodeCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },

  helperText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  buttonRow: {
    gap: 8,
  },


  inlineActionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  inlineActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },

  inlineActionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.12,
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.15,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  badgeLeft: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeLeftText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
    position: 'relative',
  },

  optionHoldFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 22,
  },

  optionHoldCircle: {
    position: 'absolute',
  },

  optionHoldStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1.5,
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },

  optionTitle: {
    fontSize: 19,
    fontWeight: '800',
    flexShrink: 1,
    lineHeight: 24,
  },

  optionMeta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },

  optionDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },

  themeHoldHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    paddingHorizontal: 2,
  },

  themeSupportNote: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    paddingHorizontal: 2,
    marginTop: -2,
  },

  previewRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    height: 56,
  },

  previewCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },

  previewTall: {
    width: 22,
    borderRadius: 16,
  },

  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  previewLine: {
    height: 7,
    borderRadius: 999,
    width: '92%',
  },

  previewLineShort: {
    height: 6,
    borderRadius: 999,
    width: '58%',
  },
})
