import { Car } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const GREEN = '#4CAF50';

interface LoadingScreenProps {
  duration?: number;
}

export default function LoadingScreen({ duration = 5000 }: LoadingScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const carAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(lineWidth, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(carAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(carAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [duration]);

  const animatedLineWidth = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const carTranslateX = carAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ translateX: carTranslateX }] },
          ]}
        >
          <Car size={44} color={GREEN} strokeWidth={1.5} />
        </Animated.View>

        <View style={styles.titleContainer}>
          <Text style={styles.titleOur}>Our</Text>
          <Text style={styles.titleUber}>Uber</Text>
        </View>

        <View style={styles.loadingContainer}>
          <View style={styles.loadingTrack}>
            <Animated.View
              style={[
                styles.loadingBar,
                { width: animatedLineWidth },
              ]}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 32,
  },
  titleOur: {
    fontSize: 36,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: -1,
  },
  titleUber: {
    fontSize: 36,
    fontWeight: '700',
    color: GREEN,
    letterSpacing: -1,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingTrack: {
    width: 100,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: GREEN,
    borderRadius: 1,
  },
});
