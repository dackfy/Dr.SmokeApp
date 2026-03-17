import React from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LiquidGlassContainerView,
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidTabBarAndroid from './LiquidTabBar.android';

export type TabKey = 'home' | 'mail' | 'trash' | 'profile';

type TabConfig = {
  key: TabKey;
  icon: ImageSourcePropType;
  label: string;
};

type LiquidTabBarProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  homeIcon: ImageSourcePropType;
  profileIcon: ImageSourcePropType;
  mailIcon?: ImageSourcePropType;
  trashIcon?: ImageSourcePropType;
  homeLabel?: string;
  profileLabel?: string;
  themeMode?: 'dark' | 'light';
  activeTintColor?: string;
  activeBackgroundColor?: string;
  inactiveTintColor?: string;
  shellBackgroundColor?: string;
  shellBorderColor?: string;
};

const BAR_HORIZONTAL_PADDING = 46;
const BAR_BOTTOM_OFFSET = 2;
const BAR_HEIGHT = 56;
const INNER_PADDING = 6;
const TAB_GAP = 8;
const BASE_PILL_INSET = 3;
const ACTIVE_PILL_RADIUS = 50;
const SAFE_INSET_RATIO = 0.5;
const ACTIVE_ICON_TINT = '#FF6A00';
const INACTIVE_ICON_TINT = '#8E8E93';
const EXTRA_TAB_LABEL_COLOR = '#A3A3AB';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function SharedLiquidTabBar({
  activeTab,
  onTabChange,
  homeIcon,
  profileIcon,
  mailIcon,
  trashIcon,
  homeLabel = 'Главная',
  profileLabel = 'Профиль',
  themeMode = 'dark',
}: LiquidTabBarProps) {
  const isLightTheme = themeMode === 'light';
  const hasExtraTabs = Boolean(mailIcon && trashIcon);
  const inactiveIconTint = isLightTheme ? '#64748B' : INACTIVE_ICON_TINT;
  const activeIconTint = isLightTheme ? '#2563EB' : ACTIVE_ICON_TINT;
  const extraTabLabelColor = isLightTheme ? '#94A3B8' : EXTRA_TAB_LABEL_COLOR;
  const fallbackContainerColor = isLightTheme
    ? 'rgba(255,255,255,0.84)'
    : 'rgba(24,24,26,0.28)';
  const rimColor = isLightTheme ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.3)';
  const activePillColor = isLightTheme
    ? 'rgba(37,99,235,0.08)'
    : 'rgba(255,255,255,0.04)';
  const activePillFallbackColor = isLightTheme
    ? 'rgba(37,99,235,0.16)'
    : 'rgba(255,255,255,0.12)';
  const activePillRimColor = isLightTheme
    ? 'rgba(37,99,235,0.12)'
    : 'rgba(255,255,255,0.08)';

  const tabs = React.useMemo<TabConfig[]>(
    () =>
      hasExtraTabs
        ? [
            { key: 'home', icon: homeIcon, label: homeLabel },
            { key: 'mail', icon: mailIcon as ImageSourcePropType, label: 'Почта' },
            { key: 'trash', icon: trashIcon as ImageSourcePropType, label: 'Корзина' },
            { key: 'profile', icon: profileIcon, label: profileLabel },
          ]
        : [
            { key: 'home', icon: homeIcon, label: homeLabel },
            { key: 'profile', icon: profileIcon, label: profileLabel },
          ],
    [hasExtraTabs, homeIcon, homeLabel, mailIcon, profileIcon, profileLabel, trashIcon],
  );

  const activeSlotIndex = Math.max(0, tabs.findIndex(tab => tab.key === activeTab));
  const slotCount = tabs.length;
  const maxSlotIndex = slotCount - 1;

  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = React.useState(0);

  const indicatorX = React.useRef(new Animated.Value(0)).current;
  const dragStretch = React.useRef(new Animated.Value(0)).current;
  const dragVelocity = React.useRef(new Animated.Value(0)).current;
  const dragDirection = React.useRef(new Animated.Value(0)).current;
  const edgeOverdrag = React.useRef(new Animated.Value(0)).current;
  const pressGrow = React.useRef(new Animated.Value(0)).current;
  const squashPulse = React.useRef(new Animated.Value(0)).current;

  const dragStartX = React.useRef(0);
  const prevVxRef = React.useRef(0);
  const isDragging = React.useRef(false);
  const isTapAnimating = React.useRef(false);

  const itemWidth =
    barWidth > 0
      ? (barWidth - INNER_PADDING * 2 - TAB_GAP * (slotCount - 1)) / slotCount
      : 0;

  const trackWidth =
    itemWidth > 0 ? itemWidth * slotCount + TAB_GAP * (slotCount - 1) : 0;

  const slotUnit = itemWidth + TAB_GAP;
  const maxX = itemWidth > 0 ? maxSlotIndex * slotUnit : 0;

  const bubbleBaseWidth = itemWidth > 0 ? clamp(itemWidth * 0.84, 52, 74) : 0;
  const bubbleBaseLeft =
    itemWidth > 0 ? INNER_PADDING + (itemWidth - bubbleBaseWidth) / 2 : INNER_PADDING;

  const moveIndicatorTo = React.useCallback(
    (nextX: number, withAnimation: boolean) => {
      const clampedX = clamp(nextX, 0, maxX);

      if (withAnimation) {
        Animated.spring(indicatorX, {
          toValue: clampedX,
          useNativeDriver: false,
          speed: 22,
          bounciness: 6,
        }).start();
        return;
      }

      indicatorX.setValue(clampedX);
    },
    [indicatorX, maxX],
  );

  const panHandlers = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,

        onMoveShouldSetPanResponder: (_, gestureState) => {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          return absDx > 2 && absDx >= absDy;
        },

        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          return absDx > 2 && absDx >= absDy;
        },

        onPanResponderGrant: () => {
          isDragging.current = true;
          prevVxRef.current = 0;
          dragDirection.setValue(0);
          edgeOverdrag.setValue(0);
          squashPulse.setValue(0);

          indicatorX.stopAnimation(currentValue => {
            dragStartX.current = currentValue;
          });

          Animated.spring(pressGrow, {
            toValue: 1.05,
            useNativeDriver: false,
            speed: 20,
            bounciness: 10,
          }).start();
        },

        onPanResponderMove: (_, gestureState) => {
          const nextX = dragStartX.current + gestureState.dx;
          moveIndicatorTo(nextX, false);

          const stretchTarget = Math.min(
            Math.abs(gestureState.dx) * 0.9 + Math.abs(gestureState.vx) * 18,
            42,
          );

          dragStretch.setValue(stretchTarget);
          dragVelocity.setValue(Math.min(Math.abs(gestureState.vx) * 1.2, 2.6));

          const directionSource =
            Math.abs(gestureState.dx) > 2
              ? gestureState.dx
              : Math.abs(gestureState.vx) > 0.12
                ? gestureState.vx
                : 0;

          if (directionSource !== 0) {
            dragDirection.setValue(directionSource > 0 ? 1 : -1);
          }

          const currentVx = gestureState.vx;
          const previousVx = prevVxRef.current;
          const directionFlipBoost = currentVx * previousVx < 0 ? 0.5 : 0;
          const jerk = Math.abs(currentVx - previousVx);

          const pulse = Math.min(
            1,
            Math.abs(currentVx) * 0.32 + jerk * 0.95 + directionFlipBoost,
          );

          prevVxRef.current = currentVx;
          squashPulse.setValue(pulse);

          const overdrag = nextX < 0 ? nextX : nextX > maxX ? nextX - maxX : 0;
          edgeOverdrag.setValue(Math.min(Math.max(overdrag, -12), 8));
        },

        onPanResponderRelease: (event, gestureState) => {
          const absDx = Math.abs(gestureState.dx);
          const isTap = absDx < 6;
          let nextSlot = 0;

          if (isTap) {
            const touchX = clamp(event.nativeEvent.locationX - INNER_PADDING, 0, trackWidth);
            const rawSlot = slotUnit > 0 ? Math.floor(touchX / slotUnit) : 0;
            const candidateSlot = clamp(rawSlot, 0, maxSlotIndex);
            const xInsideSlot = touchX - candidateSlot * slotUnit;
            const isInsideItem = xInsideSlot <= itemWidth;
            nextSlot = isInsideItem ? candidateSlot : activeSlotIndex;
          } else {
            const releasePx = dragStartX.current + gestureState.dx;
            nextSlot =
              slotUnit > 0 ? clamp(Math.round(releasePx / slotUnit), 0, maxSlotIndex) : 0;
          }

          const nextTab = tabs[nextSlot]?.key ?? 'home';
          const targetX = nextSlot * slotUnit;

          const slotDistance = Math.abs(nextSlot - activeSlotIndex);
          const travelDuration = 230 + slotDistance * 120;
          const deformDuration = 120 + slotDistance * 30;

          if (isTap && nextSlot !== activeSlotIndex) {
            const tapDirection = nextSlot > activeSlotIndex ? 1 : -1;
            isTapAnimating.current = true;
            onTabChange(nextTab);

            indicatorX.stopAnimation(() => {
              dragDirection.setValue(tapDirection);

              Animated.parallel([
                Animated.timing(indicatorX, {
                  toValue: targetX,
                  duration: travelDuration,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: false,
                }),
                Animated.sequence([
                  Animated.timing(dragStretch, {
                    toValue: 24,
                    duration: deformDuration,
                    useNativeDriver: false,
                  }),
                  Animated.spring(dragStretch, {
                    toValue: 0,
                    useNativeDriver: false,
                    speed: 18,
                    bounciness: 5,
                  }),
                ]),
                Animated.sequence([
                  Animated.timing(dragVelocity, {
                    toValue: 1.25,
                    duration: deformDuration,
                    useNativeDriver: false,
                  }),
                  Animated.spring(dragVelocity, {
                    toValue: 0,
                    useNativeDriver: false,
                    speed: 18,
                    bounciness: 5,
                  }),
                ]),
                Animated.sequence([
                  Animated.timing(squashPulse, {
                    toValue: 0.48,
                    duration: deformDuration - 4,
                    useNativeDriver: false,
                  }),
                  Animated.spring(squashPulse, {
                    toValue: 0,
                    useNativeDriver: false,
                    speed: 18,
                    bounciness: 5,
                  }),
                ]),
                Animated.sequence([
                  Animated.timing(pressGrow, {
                    toValue: 0.34,
                    duration: deformDuration - 4,
                    useNativeDriver: false,
                  }),
                  Animated.spring(pressGrow, {
                    toValue: 0,
                    useNativeDriver: false,
                    speed: 19,
                    bounciness: 5,
                  }),
                ]),
                Animated.spring(edgeOverdrag, {
                  toValue: 0,
                  useNativeDriver: false,
                  speed: 20,
                  bounciness: 5,
                }),
              ]).start(() => {
                isTapAnimating.current = false;
                Animated.spring(dragDirection, {
                  toValue: 0,
                  useNativeDriver: false,
                  speed: 22,
                  bounciness: 6,
                }).start();
              });
            });
          } else {
            isTapAnimating.current = false;

            moveIndicatorTo(targetX, true);

            Animated.spring(dragStretch, {
              toValue: 0,
              useNativeDriver: false,
              speed: 24,
              bounciness: 6,
            }).start();

            Animated.spring(dragVelocity, {
              toValue: 0,
              useNativeDriver: false,
              speed: 22,
              bounciness: 6,
            }).start();

            Animated.spring(dragDirection, {
              toValue: 0,
              useNativeDriver: false,
              speed: 22,
              bounciness: 6,
            }).start();

            Animated.spring(edgeOverdrag, {
              toValue: 0,
              useNativeDriver: false,
              speed: 20,
              bounciness: 5,
            }).start();

            Animated.spring(squashPulse, {
              toValue: 0,
              useNativeDriver: false,
              speed: 22,
              bounciness: 6,
            }).start();

            Animated.spring(pressGrow, {
              toValue: 0,
              useNativeDriver: false,
              speed: 24,
              bounciness: 6,
            }).start();

            onTabChange(nextTab);
          }

          isDragging.current = false;
        },

        onPanResponderTerminate: (_, gestureState) => {
          const finalX = dragStartX.current + gestureState.dx;
          const nextSlot =
            slotUnit > 0 ? clamp(Math.round(finalX / slotUnit), 0, maxSlotIndex) : 0;

          moveIndicatorTo(nextSlot * slotUnit, true);

          Animated.spring(dragStretch, {
            toValue: 0,
            useNativeDriver: false,
            speed: 24,
            bounciness: 6,
          }).start();

          Animated.spring(dragVelocity, {
            toValue: 0,
            useNativeDriver: false,
            speed: 22,
            bounciness: 6,
          }).start();

          Animated.spring(dragDirection, {
            toValue: 0,
            useNativeDriver: false,
            speed: 22,
            bounciness: 6,
          }).start();

          Animated.spring(edgeOverdrag, {
            toValue: 0,
            useNativeDriver: false,
            speed: 20,
            bounciness: 5,
          }).start();

          Animated.spring(squashPulse, {
            toValue: 0,
            useNativeDriver: false,
            speed: 22,
            bounciness: 6,
          }).start();

          Animated.spring(pressGrow, {
            toValue: 0,
            useNativeDriver: false,
            speed: 24,
            bounciness: 6,
          }).start();

          isDragging.current = false;
        },
      }).panHandlers,
    [
      dragDirection,
      dragStretch,
      dragVelocity,
      edgeOverdrag,
      indicatorX,
      maxSlotIndex,
      maxX,
      moveIndicatorTo,
      onTabChange,
      pressGrow,
      slotUnit,
      squashPulse,
      tabs,
      activeSlotIndex,
      itemWidth,
      trackWidth,
    ],
  );

  React.useEffect(() => {
    if (itemWidth <= 0 || isDragging.current || isTapAnimating.current) {
      return;
    }
    moveIndicatorTo(activeSlotIndex * slotUnit, true);
  }, [activeSlotIndex, itemWidth, moveIndicatorTo, slotUnit]);

  const stretchShiftX = dragStretch.interpolate({
    inputRange: [0, 42],
    outputRange: [0, 10],
    extrapolate: 'clamp',
  });

  const velocityShiftX = dragVelocity.interpolate({
    inputRange: [0, 2.6],
    outputRange: [0, 5],
    extrapolate: 'clamp',
  });

  const trailingShiftX = Animated.multiply(
    dragDirection,
    Animated.add(stretchShiftX, velocityShiftX),
  );

  const trailingTranslateX = Animated.multiply(trailingShiftX, -0.7);

  const edgeTranslateX = edgeOverdrag.interpolate({
    inputRange: [-12, 0, 12],
    outputRange: [-9.2, 0, 3.8],
    extrapolate: 'clamp',
  });

  const edgeWidthExtra = edgeOverdrag.interpolate({
    inputRange: [-12, 0, 12],
    outputRange: [6.4, 0, 3.9],
    extrapolate: 'clamp',
  });

  const edgeCenterShift = edgeOverdrag.interpolate({
    inputRange: [-12, 0, 12],
    outputRange: [-4.8, 0, 1.9],
    extrapolate: 'clamp',
  });

  const edgeStretchDampen = edgeOverdrag.interpolate({
    inputRange: [-12, 0, 12],
    outputRange: [0.78, 1, 0.84],
    extrapolate: 'clamp',
  });

  const dragScaleX = dragStretch.interpolate({
    inputRange: [0, 42],
    outputRange: [1, 1.09],
    extrapolate: 'clamp',
  });

  const velocityScaleX = dragVelocity.interpolate({
    inputRange: [0, 2.6],
    outputRange: [1, 1.07],
    extrapolate: 'clamp',
  });

  const dragScaleY = dragStretch.interpolate({
    inputRange: [0, 42],
    outputRange: [1, 0.88],
    extrapolate: 'clamp',
  });

  const velocityScaleY = dragVelocity.interpolate({
    inputRange: [0, 2.6],
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });

  const pulseScaleX = squashPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
    extrapolate: 'clamp',
  });

  const pulseScaleY = squashPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const protrudeY = Animated.add(
    pressGrow.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 3],
      extrapolate: 'clamp',
    }),
    Animated.add(
      dragStretch.interpolate({
        inputRange: [0, 42],
        outputRange: [0, 6],
        extrapolate: 'clamp',
      }),
      dragVelocity.interpolate({
        inputRange: [0, 2.6],
        outputRange: [0, 7],
        extrapolate: 'clamp',
      }),
    ),
  );

  const pressScaleX = pressGrow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
    extrapolate: 'clamp',
  });

  const pressScaleY = pressGrow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
    extrapolate: 'clamp',
  });

  const rimOpacity = pressGrow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.2],
    extrapolate: 'clamp',
  });

  const barRimOpacity = pressGrow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.36],
    extrapolate: 'clamp',
  });

  const bubbleDynamicWidth = Animated.add(
    Animated.add(
      Animated.add(
        Animated.add(bubbleBaseWidth, edgeWidthExtra),
        Animated.multiply(
          Animated.multiply(dragStretch, 0.3),
          edgeStretchDampen,
        ),
      ),
      Animated.multiply(
        Animated.multiply(dragVelocity, 3.2),
        edgeStretchDampen,
      ),
    ),
    Animated.add(
      Animated.multiply(pressGrow, 2),
      Animated.multiply(squashPulse, 7),
    ),
  );

  const bubbleScaleXCombined = Animated.multiply(
    Animated.multiply(pressScaleX, dragScaleX),
    Animated.multiply(velocityScaleX, pulseScaleX),
  );

  const bubbleVisualWidth = Animated.multiply(
    bubbleDynamicWidth,
    bubbleScaleXCombined,
  );

  const bubbleTrackX = Animated.add(
    Animated.add(indicatorX, trailingTranslateX),
    Animated.add(edgeTranslateX, edgeCenterShift),
  );

  const bubbleCenterX = Animated.add(
    Animated.add(bubbleBaseLeft, bubbleTrackX),
    Animated.multiply(bubbleDynamicWidth, 0.5),
  );

  const highlightMaskLeft = Animated.subtract(
    bubbleCenterX,
    Animated.multiply(bubbleVisualWidth, 0.5),
  );

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: Math.round(insets.bottom * SAFE_INSET_RATIO) + BAR_BOTTOM_OFFSET,
        },
      ]}>
      <LiquidGlassContainerView
        style={[
          styles.container,
          !isLiquidGlassSupported && styles.containerFallback,
          !isLiquidGlassSupported && { backgroundColor: fallbackContainerColor },
        ]}
        spacing={TAB_GAP}
        onLayout={event => setBarWidth(event.nativeEvent.layout.width)}>
        <LiquidGlassView
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.barGlass]}
          effect="regular"
          tintColor="rgba(255,255,255,0.01)"
          colorScheme="system"
        />

        <Animated.View
          pointerEvents="none"
          style={[styles.barRim, { opacity: barRimOpacity, borderColor: rimColor }]}
        />

        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
            style={[
              styles.activePill,
              { backgroundColor: activePillColor },
              {
                width: bubbleDynamicWidth,
                left: bubbleBaseLeft,
                top: Animated.add(Animated.multiply(protrudeY, -1), BASE_PILL_INSET),
                bottom: Animated.add(Animated.multiply(protrudeY, -1), BASE_PILL_INSET),
                transform: [
                  {
                    translateX: bubbleTrackX,
                  },
                  { scaleX: pressScaleX },
                  { scaleX: dragScaleX },
                  { scaleX: velocityScaleX },
                  { scaleX: pulseScaleX },
                  { scaleY: pressScaleY },
                  { scaleY: dragScaleY },
                  { scaleY: velocityScaleY },
                  { scaleY: pulseScaleY },
                ],
              },
            ]}>
            <LiquidGlassView
              style={[
                StyleSheet.absoluteFill,
                styles.activePillGlass,
                !isLiquidGlassSupported && styles.activePillFallback,
                !isLiquidGlassSupported && { backgroundColor: activePillFallbackColor },
              ]}
              effect="regular"
              tintColor="rgba(255,255,255,0.03)"
              colorScheme="system"
              interactive
            />
            <Animated.View
              style={[
                styles.activePillRim,
                { opacity: rimOpacity, borderColor: activePillRimColor },
              ]}
            />
          </Animated.View>
        ) : null}

        <View style={styles.tabsRow} {...panHandlers}>
          {tabs.map(tab => (
            <View key={tab.key} style={styles.tabButton} pointerEvents="none">
              <Image source={tab.icon} style={[styles.icon, { tintColor: inactiveIconTint }]} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: inactiveIconTint },
                  (tab.key === 'mail' || tab.key === 'trash')
                    ? [styles.tabLabelExtra, { color: extraTabLabelColor }]
                    : null,
                ]}>
                {tab.label}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={styles.tabsOverlayContainer}
          pointerEvents="none"
          renderToHardwareTextureAndroid
          shouldRasterizeIOS>
          <Animated.View
            style={[
              styles.tabsOverlayMask,
              {
                width: bubbleVisualWidth,
                transform: [{ translateX: highlightMaskLeft }],
              },
            ]}>
            <Animated.View
              renderToHardwareTextureAndroid
              shouldRasterizeIOS
              style={[
                styles.tabsOverlayContent,
                {
                  width: barWidth,
                  transform: [{ translateX: Animated.multiply(highlightMaskLeft, -1) }],
                },
              ]}>
              {tabs.map(tab => (
                <View key={`overlay-${tab.key}`} style={styles.tabButton}>
                  <Image
                    source={tab.icon}
                    style={[styles.icon, styles.iconActive, { tintColor: activeIconTint }]}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      styles.tabLabelActive,
                      { color: activeIconTint },
                    ]}>
                    {tab.label}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </Animated.View>
        </View>
      </LiquidGlassContainerView>
    </View>
  );
}

export default function LiquidTabBar(props: LiquidTabBarProps) {
  if (Platform.OS === 'android') {
    return <LiquidTabBarAndroid {...props} />
  }

  return <SharedLiquidTabBar {...props} />
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: BAR_HORIZONTAL_PADDING,
    right: BAR_HORIZONTAL_PADDING,
    zIndex: 50,
    elevation: 50,
  },

  container: {
    height: BAR_HEIGHT,
    borderRadius: 999,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },

  containerFallback: {
    backgroundColor: 'rgba(24,24,26,0.28)',
  },

  barGlass: {
    borderRadius: 999,
    backgroundColor: 'transparent',
  },

  barRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INNER_PADDING,
    paddingVertical: 6,
    gap: TAB_GAP,
  },

  tabsOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },

  tabsOverlayMask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: ACTIVE_PILL_RADIUS,
  },

  tabsOverlayContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INNER_PADDING,
    paddingVertical: 6,
    gap: TAB_GAP,
  },

  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },

  icon: {
    width: 19,
    height: 19,
    resizeMode: 'contain',
    tintColor: INACTIVE_ICON_TINT,
    opacity: Platform.OS === 'ios' && isLiquidGlassSupported ? 0.94 : 0.9,
  },

  iconActive: {
    tintColor: ACTIVE_ICON_TINT,
    opacity: 1,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: INACTIVE_ICON_TINT,
  },

  tabLabelActive: {
    color: ACTIVE_ICON_TINT,
  },

  tabLabelExtra: {
    color: EXTRA_TAB_LABEL_COLOR,
  },

  activePill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: ACTIVE_PILL_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    overflow: 'hidden',
  },

  activePillGlass: {
    borderRadius: ACTIVE_PILL_RADIUS,
  },

  activePillFallback: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  activePillRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ACTIVE_PILL_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
