import React from 'react'
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

type ElasticScrollViewProps = ScrollViewProps & {
  elasticEnabled?: boolean
  enableTopElastic?: boolean
  enableBottomElastic?: boolean
  elasticMaxOffset?: number
  elasticDamping?: number
  elasticContainerStyle?: StyleProp<ViewStyle>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: 'visible',
  },
  edgeGlow: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 26,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    pointerEvents: 'none',
  },
  topGlow: {
    top: 8,
  },
  bottomGlow: {
    bottom: 8,
  },
})

const ElasticScrollView = React.forwardRef<ScrollView, ElasticScrollViewProps>(
  (
    {
      children,
      onScroll,
      onLayout,
      onContentSizeChange,
      elasticEnabled = Platform.OS === 'android',
      enableTopElastic = true,
      enableBottomElastic = true,
      elasticMaxOffset = 60,
      elasticDamping = 0.46,
      elasticContainerStyle,
      showsVerticalScrollIndicator = false,
      ...scrollProps
    },
    ref,
  ) => {
    const translateY = React.useRef(new Animated.Value(0)).current
    const contentHeightRef = React.useRef(1)
    const viewportHeightRef = React.useRef(1)
    const scrollYRef = React.useRef(0)

    const releaseElastic = React.useCallback(() => {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 24,
        bounciness: 7,
      }).start()
    }, [translateY])

    const panResponder = React.useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponderCapture: (_, gestureState) => {
            if (!elasticEnabled) {
              return false
            }

            const isVertical =
              Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
              Math.abs(gestureState.dy) > 6

            if (!isVertical) {
              return false
            }

            const atTop = scrollYRef.current <= 12
            const atBottom =
              contentHeightRef.current <= viewportHeightRef.current + 1 ||
              scrollYRef.current + viewportHeightRef.current >=
                contentHeightRef.current - 16

            return (
              (enableTopElastic && atTop && gestureState.dy > 0) ||
              (enableBottomElastic && atBottom && gestureState.dy < 0)
            )
          },
          onPanResponderMove: (_, gestureState) => {
            const atTop = scrollYRef.current <= 12
            const atBottom =
              contentHeightRef.current <= viewportHeightRef.current + 1 ||
              scrollYRef.current + viewportHeightRef.current >=
                contentHeightRef.current - 16

            let nextOffset = 0

            if (enableTopElastic && atTop && gestureState.dy > 0) {
              nextOffset = clamp(
                gestureState.dy * elasticDamping,
                0,
                elasticMaxOffset,
              )
            } else if (enableBottomElastic && atBottom && gestureState.dy < 0) {
              nextOffset = clamp(
                gestureState.dy * elasticDamping,
                -elasticMaxOffset,
                0,
              )
            }

            translateY.setValue(nextOffset)
          },
          onPanResponderRelease: releaseElastic,
          onPanResponderTerminate: releaseElastic,
          onPanResponderTerminationRequest: () => true,
        }),
      [
        elasticDamping,
        elasticEnabled,
        elasticMaxOffset,
        enableBottomElastic,
        enableTopElastic,
        releaseElastic,
        translateY,
      ],
    )

    const scale = translateY.interpolate({
      inputRange: [-elasticMaxOffset, 0, elasticMaxOffset],
      outputRange: [0.988, 1, 0.988],
      extrapolate: 'clamp',
    })
    const topGlowOpacity = translateY.interpolate({
      inputRange: [0, elasticMaxOffset * 0.45, elasticMaxOffset],
      outputRange: [0, 0.1, 0.24],
      extrapolate: 'clamp',
    })
    const bottomGlowOpacity = translateY.interpolate({
      inputRange: [-elasticMaxOffset, -elasticMaxOffset * 0.45, 0],
      outputRange: [0.24, 0.1, 0],
      extrapolate: 'clamp',
    })

    const handleScroll = React.useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y
        onScroll?.(event)
      },
      [onScroll],
    )

    const handleLayout = React.useCallback(
      (event: LayoutChangeEvent) => {
        viewportHeightRef.current = event.nativeEvent.layout.height
        onLayout?.(event)
      },
      [onLayout],
    )

    const handleContentSizeChange = React.useCallback(
      (width: number, height: number) => {
        contentHeightRef.current = height
        onContentSizeChange?.(width, height)
      },
      [onContentSizeChange],
    )

    return (
      <Animated.View
        style={[
          styles.wrapper,
          elasticContainerStyle,
          elasticEnabled
            ? {
                transform: [{ translateY }, { scale }],
              }
            : null,
        ]}
        {...(elasticEnabled ? panResponder.panHandlers : {})}>
        {elasticEnabled ? (
          <>
            <Animated.View
              style={[
                styles.edgeGlow,
                styles.topGlow,
                {
                  opacity: topGlowOpacity,
                  transform: [{ scaleX: scale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.edgeGlow,
                styles.bottomGlow,
                {
                  opacity: bottomGlowOpacity,
                  transform: [{ scaleX: scale }],
                },
              ]}
            />
          </>
        ) : null}
        <ScrollView
          ref={ref}
          {...scrollProps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          onLayout={handleLayout}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}>
          {children}
        </ScrollView>
      </Animated.View>
    )
  },
)

ElasticScrollView.displayName = 'ElasticScrollView'

export default ElasticScrollView
