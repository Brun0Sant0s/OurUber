import LoadingScreen from '@/components/screens/LoadingScreen';
import AppHeader from '@/components/shared/AppHeader';
import { useServiceNotifications } from '@/contexts/ServiceNotificationContext';
import { useModeSelection } from '@/hooks/use-mode-selection';
import { useOnAuthChange } from '@/hooks/use-onauth-change';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUserTrips } from '@/hooks/use-user-trips';
import { Service, ServiceStatus } from '@/types/user';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Car,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  Star,
  User,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type TabType = 'pending' | 'active' | 'completed' | 'cancelled';

const TABS: { key: TabType; label: string }[] = [
  { key: 'active', label: 'Ativas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'completed', label: 'Concluídas' },
  { key: 'cancelled', label: 'Canceladas' },
];

const PENDING_STATUSES: ServiceStatus[] = ['pending', 'negotiating', 'accepted'];
const ACTIVE_STATUSES: ServiceStatus[] = ['in_progress'];
const COMPLETED_STATUSES: ServiceStatus[] = ['completed'];
const CANCELLED_STATUSES: ServiceStatus[] = ['cancelled', 'expired'];

export default function MyTrips() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string | string[];
    serviceId?: string | string[];
  }>();
  const { user } = useOnAuthChange();
  const { profile, updateProfile } = useUserProfile(user?.uid || null);
  const { mode, setMode } = useModeSelection();
  const { setHasTripsUpdate } = useServiceNotifications();

  // se o user so tem um role usa esse, se tem os dois usa o q ta selecionado
  const effectiveMode = profile?.role === 'both'
    ? mode
    : profile?.role === 'driver'
      ? 'driver'
      : 'client';

  const { trips, loading, error } = useUserTrips(user?.uid || null, effectiveMode);

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const autoOpenedRef = useRef<string | null>(null);
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const serviceIdParam = Array.isArray(params.serviceId) ? params.serviceId[0] : params.serviceId;

  const hasPendingService = trips.some(t => PENDING_STATUSES.includes(t.status));
  const hasActiveService = trips.some(t => ACTIVE_STATUSES.includes(t.status));

  useEffect(() => {
    setHasTripsUpdate(hasPendingService || hasActiveService);
  }, [hasPendingService, hasActiveService, setHasTripsUpdate]);

  useEffect(() => {
    if (!tabParam) return;
    const normalizedTab = tabParam.toLowerCase();
    if (TABS.some((tab) => tab.key === normalizedTab)) {
      setActiveTab(normalizedTab as TabType);
    }
  }, [tabParam]);

  const getFilteredTrips = () => {
    let statusFilter: ServiceStatus[];
    switch (activeTab) {
      case 'pending':
        statusFilter = PENDING_STATUSES;
        break;
      case 'active':
        statusFilter = ACTIVE_STATUSES;
        break;
      case 'completed':
        statusFilter = COMPLETED_STATUSES;
        break;
      case 'cancelled':
        statusFilter = CANCELLED_STATUSES;
        break;
      default:
        statusFilter = [];
    }

    return trips.filter((trip) => statusFilter.includes(trip.status));
  };

  const filteredTrips = getFilteredTrips();

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Hoje às ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `Ontem às ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days < 7) {
      return `Há ${days} dias`;
    } else {
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  const isUserClient = (trip: Service): boolean => {
    return trip.clientId === user?.uid;
  };

  const handleTripPress = useCallback((trip: Service) => {
    if (ACTIVE_STATUSES.includes(trip.status) || PENDING_STATUSES.includes(trip.status)) {
      if (profile?.activeServiceId !== trip.id) {
        updateProfile({ activeServiceId: trip.id, status: 'conditioned' });
      }
      router.push({ pathname: '/(tabs)/active-service', params: { serviceId: trip.id } } as any);
    }
  }, [profile?.activeServiceId, router, updateProfile]);

  // se vem com serviceId nos params abre logo esse servico automaticamente
  useEffect(() => {
    if (!serviceIdParam || trips.length === 0) return;

    const targetTrip = trips.find((trip) => trip.id === serviceIdParam);
    if (!targetTrip) return;
    if (!(ACTIVE_STATUSES.includes(targetTrip.status) || PENDING_STATUSES.includes(targetTrip.status))) {
      return;
    }

    if (autoOpenedRef.current === serviceIdParam) return;
    autoOpenedRef.current = serviceIdParam;
    handleTripPress(targetTrip);
  }, [handleTripPress, serviceIdParam, trips]);

  const renderTripItem = ({ item }: { item: Service }) => {
    const userIsClient = isUserClient(item);
    const otherPartyName = userIsClient ? item.driverName : item.clientName;
    const isActive = ACTIVE_STATUSES.includes(item.status) || PENDING_STATUSES.includes(item.status);
    const getCardBorderColor = () => {
      if (COMPLETED_STATUSES.includes(item.status)) return '#4CAF50';
      if (CANCELLED_STATUSES.includes(item.status)) return '#ff6666';
      if (PENDING_STATUSES.includes(item.status)) return '#ffaa00';
      if (ACTIVE_STATUSES.includes(item.status)) return '#2196F3';
      return 'transparent';
    };

    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          isActive && styles.tripCardActive,
          { borderColor: getCardBorderColor() },
        ]}
        onPress={() => handleTripPress(item)}
        disabled={!isActive}
        activeOpacity={isActive ? 0.7 : 1}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripHeaderLeft}>
            <Text style={styles.tripDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View />
        </View>

        {otherPartyName && (
          <View style={styles.partyInfo}>
            <View style={styles.partyAvatar}>
              {userIsClient ? (
                <Car size={18} color="#ffffff" />
              ) : (
                <User size={18} color="#ffffff" />
              )}
            </View>
            <View style={styles.partyDetails}>
              <Text style={styles.partyName}>{otherPartyName}</Text>
              {userIsClient && item.driverRating && (
                <View style={styles.ratingRow}>
                  <Star size={12} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.ratingText}>{item.driverRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            {item.status === 'completed' && item.rating && (
              <View style={styles.tripRating}>
                <Text style={styles.tripRatingLabel}>Avaliação</Text>
                <View style={styles.tripRatingValue}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.tripRatingText}>{item.rating}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={[styles.routeIcon, styles.routeIconOrigin]}>
              <MapPin size={12} color="#ffffff" />
            </View>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {item.origin.address || 'Origem'}
            </Text>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeItem}>
            <View style={[styles.routeIcon, styles.routeIconDestination]}>
              <Navigation size={12} color="#ffffff" />
            </View>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {item.destination.address || 'Destino'}
            </Text>
          </View>
        </View>

        {isActive && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeIndicatorText}>Toque para ver detalhes</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      {activeTab === 'pending' ? (
        <>
          <Clock size={64} color="#333333" />
          <Text style={styles.emptyTitle}>Sem serviços pendentes</Text>
          <Text style={styles.emptySubtitle}>
            Quando houver viagens a aguardar confirmação, aparecerão aqui.
          </Text>
        </>
      ) : activeTab === 'active' ? (
        <>
          <Car size={64} color="#333333" />
          <Text style={styles.emptyTitle}>Sem serviços ativos</Text>
          <Text style={styles.emptySubtitle}>
            Quando tiver uma viagem em andamento, aparecerá aqui.
          </Text>
        </>
      ) : activeTab === 'completed' ? (
        <>
          <CheckCircle size={64} color="#333333" />
          <Text style={styles.emptyTitle}>Sem serviços concluídos</Text>
          <Text style={styles.emptySubtitle}>
            Suas viagens concluídas aparecerão aqui.
          </Text>
        </>
      ) : (
        <>
          <X size={64} color="#333333" />
          <Text style={styles.emptyTitle}>Sem serviços cancelados</Text>
          <Text style={styles.emptySubtitle}>
            Viagens canceladas ou expiradas aparecerão aqui.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        username={profile?.name}
        canSelectMode={profile?.role === 'both'}
        role={profile?.role}
        mode={mode}
        onChangeMode={setMode}
      />

      <View style={styles.tabsContainer}>
        {TABS.map((tab) => {
          const showBadge =
            (tab.key === 'pending' && hasPendingService) ||
            (tab.key === 'active' && hasActiveService);

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={styles.tabLabelContainer}>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {showBadge && <View style={styles.tabBadge} />}
              </View>
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredTrips.length} {filteredTrips.length === 1 ? 'viagem' : 'viagens'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filteredTrips}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        showsVerticalScrollIndicator={false}
      />

      {loading && trips.length === 0 && <LoadingScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ffffff',
  },
  countContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 12,
    color: '#666666',
  },
  errorContainer: {
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#ff6666',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 14,
  },
  listContent: {
    padding: 24,
    paddingTop: 0,
    flexGrow: 1,
  },
  tripCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tripCardActive: {
    borderWidth: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripHeaderLeft: {
    flex: 1,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#999999',
  },
  tripDate: {
    fontSize: 12,
    color: '#666666',
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  partyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partyDetails: {
    flex: 1,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFD700',
  },
  tripRating: {
    alignItems: 'flex-end',
  },
  tripRatingLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  tripRatingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  routeContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    padding: 12,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeIconOrigin: {
    backgroundColor: '#4CAF50',
  },
  routeIconDestination: {
    backgroundColor: '#F44336',
  },
  routeAddress: {
    flex: 1,
    fontSize: 13,
    color: '#cccccc',
  },
  routeConnector: {
    width: 2,
    height: 12,
    backgroundColor: '#333333',
    marginLeft: 11,
    marginVertical: 2,
  },
  activeIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222222',
    alignItems: 'center',
  },
  activeIndicatorText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 16,
  },
});
