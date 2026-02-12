import { useActiveService } from '@/hooks/use-active-service';
import { useModeSelection } from '@/hooks/use-mode-selection';
import { useOnAuthChange } from '@/hooks/use-onauth-change';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUserTrips } from '@/hooks/use-user-trips';
import { Tabs } from 'expo-router';
import { Car, Home, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const GREEN = '#4CAF50';

interface TabIconWithBadgeProps {
  icon: React.ReactNode;
  showBadge: boolean;
}

function TabIconWithBadge({ icon, showBadge }: TabIconWithBadgeProps) {
  return (
    <View style={styles.iconContainer}>
      {icon}
      {showBadge && <View style={styles.badge} />}
    </View>
  );
}

export default function TabLayout() {
  const { user } = useOnAuthChange();
  const { profile } = useUserProfile(user?.uid || null);
  const { mode } = useModeSelection();
  const { service: activeService } = useActiveService(profile?.activeServiceId || null);
  const { trips: clientTrips } = useUserTrips(user?.uid || null, 'client');
  const { trips: driverTrips } = useUserTrips(user?.uid || null, 'driver');
  const conditionedStatuses = ['pending', 'negotiating', 'accepted', 'in_progress'];
  const hasClientTripConditioned = clientTrips.some((trip) =>
    conditionedStatuses.includes(trip.status)
  );
  const hasDriverTripConditioned = driverTrips.some((trip) =>
    conditionedStatuses.includes(trip.status)
  );
  const hasActiveOrPending = !!activeService && conditionedStatuses.includes(activeService.status);
  const effectiveMode =
    profile?.role === 'both'
      ? mode
      : profile?.role === 'driver'
        ? 'driver'
        : 'client';
  const showTripsBadge =
    effectiveMode === 'driver'
      ? hasDriverTripConditioned || hasActiveOrPending
      : hasClientTripConditioned || hasActiveOrPending || !!profile?.activeServiceId;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
          height: 85,
          paddingTop: 10,
          paddingBottom: 25,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Viagens',
          tabBarIcon: ({ color }) => (
            <TabIconWithBadge
              icon={<Car size={24} color={color} />}
              showBadge={showTripsBadge}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="active-service"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
});
