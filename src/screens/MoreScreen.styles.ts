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
    padding: 18,
    gap: 14,
  },

  heroCard: {
    gap: 10,
  },

  heroAccentBar: {
    width: 72,
    height: 6,
    borderRadius: 999,
  },

  heroGlowCard: {
    borderRadius: 34,
    borderWidth: 1,
    padding: 20,
    gap: 12,
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
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },

  navRowTextWrap: {
    flex: 1,
    gap: 4,
  },

  navRowBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 14,
    lineHeight: 20,
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
    borderRadius: 21,
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 10,
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },

  portalStatValue: {
    fontSize: 20,
    lineHeight: 24,
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
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },

  portalCodeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },

  portalAccentStrip: {
    height: 6,
    borderRadius: 999,
    width: 64,
  },

  portalCodeValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 2.2,
  },

  helperText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  buttonRow: {
    gap: 10,
  },

  inlineActionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  inlineActionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },

  inlineActionText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.12,
  },

  primaryButton: {
    minHeight: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.15,
  },

  secondaryButton: {
    minHeight: 52,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
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
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionCard: {
    borderRadius: 24,
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
    borderRadius: 24,
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

  previewRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    height: 56,
  },

  previewCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },

  previewTall: {
    width: 22,
    borderRadius: 14,
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

  notificationsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  notificationsToolbarButton: {
    flex: 0,
    minHeight: 42,
    paddingHorizontal: 14,
  },

  noticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  notificationsLoadingWrap: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyStateCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },

  notificationCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },

  notificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  notificationTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },

  notificationStateBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationStateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },

  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  notificationMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
})
