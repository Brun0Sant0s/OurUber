import { useAvailableServices } from '@/hooks/use-available-services';
import { useOnAuthChange } from '@/hooks/use-onauth-change';
import { useServiceManagement } from '@/hooks/use-service-management';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Service } from '@/types/user';
import { calculateEstimatedPickupTime } from '@/utils/distance';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Car,
  Clock,
  MapPin,
  Navigation,
  User,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export default function AvailableServices() {
  const router = useRouter();
  const { user } = useOnAuthChange();
  const { profile } = useUserProfile(user?.uid || null);
  const { services, loading, error } = useAvailableServices();
  const { proposeService, loading: proposeLoading, error: proposeError } = useServiceManagement();

  const [driverLocation, setDriverLocation] = useState<LocationCoords | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'Precisamos de acesso à localização.');
          setLocationLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (err) {
        console.error('Error getting location:', err);
      } finally {
        setLocationLoading(false);
      }
    };

    getLocation();
  }, []);

  const handleAcceptService = async (service: Service) => {
    if (!user || !profile || !driverLocation) {
      Alert.alert('Erro', 'Não foi possível obter a sua localização.');
      return;
    }

    if (service.status === 'negotiating') {
      Alert.alert('Indisponível', 'Este pedido já está em negociação com outro motorista.');
      return;
    }

    const estimatedTime = calculateEstimatedPickupTime(
      driverLocation.latitude,
      driverLocation.longitude,
      service.origin.latitude,
      service.origin.longitude
    );

    Alert.alert(
      'Aceitar pedido',
      `Deseja aceitar o pedido de ${service.clientName}?\n\nTempo estimado de chegada: ${estimatedTime} min\n\nDestino: ${service.destination.address}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            const success = await proposeService(
              service.id,
              user.uid,
              profile.name,
              profile.driverRating,
              driverLocation
            );

            if (success) {
              Alert.alert(
                'Pedido aceite',
                'O cliente foi notificado e tem 3 minutos para confirmar.'
              );
            } else {
              Alert.alert(
                'Erro',
                proposeError || 'Não foi possível aceitar o pedido. Pode já ter sido aceite por outro motorista.'
              );
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('pt-PT');
  };

  const getEstimatedTime = (service: Service): string => {
    if (!driverLocation) return '...';
    const time = calculateEstimatedPickupTime(
      driverLocation.latitude,
      driverLocation.longitude,
      service.origin.latitude,
      service.origin.longitude
    );
    return `${time} min`;
  };

  const renderServiceItem = ({ item }: { item: Service }) => {
    const isNegotiating = item.status === 'negotiating';

    return (
      <View style={[styles.serviceCard, isNegotiating && styles.serviceCardNegotiating]}>
        {isNegotiating && (
          <View style={styles.negotiatingBadge}>
            <Text style={styles.negotiatingBadgeText}>Em negociação</Text>
          </View>
        )}

        <View style={styles.serviceHeader}>
          <View style={styles.clientInfo}>
            <View style={styles.clientAvatar}>
              <User size={20} color="#ffffff" />
            </View>
            <Text style={styles.clientName}>{item.clientName}</Text>
          </View>
          <View style={styles.timeInfo}>
            <View style={styles.timeContainer}>
              <Clock size={14} color="#999999" />
              <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
            </View>
            {!isNegotiating && driverLocation && (
              <View style={styles.etaContainer}>
                <Car size={14} color="#4CAF50" />
                <Text style={styles.etaText}>{getEstimatedTime(item)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={styles.routeIconContainer}>
              <MapPin size={16} color="#4CAF50" />
            </View>
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>Origem</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>
                {item.origin.address || 'Endereço não disponível'}
              </Text>
            </View>
          </View>

          <View style={styles.routeDivider} />

          <View style={styles.routeItem}>
            <View style={styles.routeIconContainer}>
              <Navigation size={16} color="#F44336" />
            </View>
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>
                {item.destination.address || 'Endereço não disponível'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.acceptButton,
            (isNegotiating || proposeLoading || !driverLocation) && styles.acceptButtonDisabled,
          ]}
          onPress={() => handleAcceptService(item)}
          disabled={isNegotiating || proposeLoading || !driverLocation}
        >
          {proposeLoading ? (
            <ActivityIndicator size="small" color="#0a0a0a" />
          ) : (
            <>
              <Car size={20} color={isNegotiating ? '#666666' : '#0a0a0a'} />
              <Text
                style={[
                  styles.acceptButtonText,
                  isNegotiating && styles.acceptButtonTextDisabled,
                ]}
              >
                {isNegotiating ? 'Indisponível' : 'Aceitar pedido'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Car size={64} color="#333333" />
      <Text style={styles.emptyTitle}>Sem pedidos disponíveis</Text>
      <Text style={styles.emptySubtitle}>
        Quando houver novos pedidos de transporte, aparecerão aqui.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedidos disponíveis</Text>
        <View style={styles.headerRight}>
          {(loading || locationLoading) && <ActivityIndicator size="small" color="#ffffff" />}
        </View>
      </View>

      {!locationLoading && !driverLocation && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Não foi possível obter a sua localização. Verifique as permissões.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={services}
        renderItem={renderServiceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        showsVerticalScrollIndicator={false}
      />

      {loading && services.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>A carregar pedidos...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  warningContainer: {
    backgroundColor: '#3a2a1a',
    borderWidth: 1,
    borderColor: '#ffaa00',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  warningText: {
    color: '#ffaa00',
    fontSize: 14,
    textAlign: 'center',
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
    paddingTop: 8,
    flexGrow: 1,
  },
  serviceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  serviceCardNegotiating: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#ffaa00',
  },
  negotiatingBadge: {
    backgroundColor: '#3a2a1a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  negotiatingBadgeText: {
    color: '#ffaa00',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#999999',
    fontSize: 12,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  etaText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  routeContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 2,
  },
  routeAddress: {
    color: '#ffffff',
    fontSize: 14,
  },
  routeDivider: {
    width: 2,
    height: 20,
    backgroundColor: '#333333',
    marginLeft: 15,
    marginVertical: 4,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  acceptButtonDisabled: {
    backgroundColor: '#333333',
  },
  acceptButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonTextDisabled: {
    color: '#666666',
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
