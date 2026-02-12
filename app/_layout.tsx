import LoadingScreen from '@/components/screens/LoadingScreen';
import { ServiceNotificationProvider } from '@/contexts/ServiceNotificationContext';
import { useOnAuthChange } from '@/hooks/use-onauth-change';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

const LOADING_TIME = 3000;

export default function RootLayout() {
  const { user, loading: authLoading } = useOnAuthChange();
  const segments = useSegments();
  const router = useRouter();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, LOADING_TIME);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authLoading || !minTimeElapsed) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!user && !inAuthGroup) {
      router.replace('/(auth)');
    }
  }, [user, authLoading, minTimeElapsed, segments]);

  const isLoading = authLoading || !minTimeElapsed;

  if (isLoading) {
    return <LoadingScreen duration={LOADING_TIME} />;
  }

  return (
    <ServiceNotificationProvider>
      <ThemeProvider value={DarkTheme}>
        <Slot />
        <StatusBar style="light" />
      </ThemeProvider>
    </ServiceNotificationProvider>
  );
}
