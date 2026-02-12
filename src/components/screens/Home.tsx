
import LoadingScreen from '@/components/screens/LoadingScreen';
import AppHeader from '@/components/shared/AppHeader';
import { useServiceNotifications } from '@/contexts/ServiceNotificationContext';
import { useActiveService } from '@/hooks/use-active-service';
import { useAvailableServices } from '@/hooks/use-available-services';
import { useModeSelection } from '@/hooks/use-mode-selection';
import { useOnAuthChange } from '@/hooks/use-onauth-change';
import { useServiceManagement } from '@/hooks/use-service-management';
import { useServiceNotificationWatcher } from '@/hooks/use-service-notifications';
import { useServiceRequest } from '@/hooks/use-service-request';
import { useUserProfile } from '@/hooks/use-user-profile';
import { LocationData } from '@/types/user';
import { calculateEstimatedPickupTime } from '@/utils/distance';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Car, Clock, MapPin, Navigation, User } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { height } = Dimensions.get('window');

interface LocationCoords {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function Home() {
  const router = useRouter();
  const { user } = useOnAuthChange();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile(user?.uid || null);
  const { mode, setMode, loading: modeLoading } = useModeSelection();
  const { service: activeService, loading: activeServiceLoading } = useActiveService(profile?.activeServiceId || null);
  const { createServiceRequest, cancelServiceRequest, loading: serviceLoading } = useServiceRequest();
  const { services: availableServices, loading: availableLoading, error: availableError } =
    useAvailableServices();
  const { proposeService, loading: proposeLoading, error: proposeError } = useServiceManagement();
  const { addNotification, setHasTripsUpdate } = useServiceNotifications();
  const mapRef = useRef<MapView>(null);

  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [origin, setOrigin] = useState<LocationCoords | null>(null);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [selectingType, setSelectingType] = useState<'origin' | 'destination' | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // flags pra saber q UI mostrar
  const isConditioned = profile?.status === 'conditioned';
  const canSelectMode = profile?.role === 'both';
  const isClientMode = mode === 'client';
  const isDriverMode = mode === 'driver';
  const isClient = profile?.role === 'client' || (profile?.role === 'both' && isClientMode);

  useServiceNotificationWatcher({
    service: activeService,
    userId: user?.uid || null,
    isClient,
  });

  useEffect(() => {
    const conditionedStatuses = ['pending', 'negotiating', 'accepted', 'in_progress'];
    const hasActiveOrPending = !!activeService && conditionedStatuses.includes(activeService.status);
    setHasTripsUpdate(hasActiveOrPending);
  }, [activeService, setHasTripsUpdate]);

  const showClientUI = profile?.role === 'client' || (profile?.role === 'both' && isClientMode);
  const showDriverUI = profile?.role === 'driver' || (profile?.role === 'both' && isDriverMode);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // sincronizar o status do user com o estado do servico ativo
  // se o user tem um servico ativo, fica "conditioned" pra n poder criar outro
  useEffect(() => {
    if (profileLoading || activeServiceLoading) return;
    if (!profile) return;
    if (profile.activeServiceId && !activeService) return;

    const conditionedStatuses = ['pending', 'negotiating', 'accepted', 'in_progress'];
    const hasConditionedService =
      !!activeService && conditionedStatuses.includes(activeService.status);
    const isClientService = !!activeService && activeService.clientId === user?.uid;
    const isDriverService = !!activeService && activeService.driverId === user?.uid;
    const shouldConditionUser =
      hasConditionedService &&
      (profile.role === 'client' ||
        isDriverService ||
        (profile.role === 'both' && isClientMode && isClientService));

    const nextStatus = shouldConditionUser ? 'conditioned' : 'free';
    const nextActiveServiceId = hasConditionedService ? profile.activeServiceId : null;

    if (profile.status !== nextStatus || profile.activeServiceId !== nextActiveServiceId) {
      updateProfile({
        status: nextStatus,
        activeServiceId: nextActiveServiceId,
      });
    }
  }, [profile, profileLoading, activeService, activeServiceLoading, updateProfile]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à localização para funcionar.');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords: LocationCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(coords);
      setOrigin(coords);

      const address = await getAddressFromCoords(coords.latitude, coords.longitude);
      setOrigin({ ...coords, address });
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // converter coordenadas pra morada
  const getAddressFromCoords = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result) {
        return `${result.street || ''} ${result.streetNumber || ''}, ${result.city || ''}`.trim();
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  // bloquear o cliente de fazer mais pedidos se ja tiver um ativo
  const conditionedStatuses = ['pending', 'negotiating', 'accepted', 'in_progress'];
  const hasActiveRequest = !!profile?.activeServiceId;
  const isClientBlockedFromRequest =
    isConditioned ||
    hasActiveRequest ||
    conditionedStatuses.includes(activeService?.status || '');
  const isDriverBlocked =
    !!activeService &&
    activeService.driverId === user?.uid &&
    conditionedStatuses.includes(activeService.status);

  const handleMapPress = async (event: any) => {
    if (!selectingType || isClientBlockedFromRequest) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    const address = await getAddressFromCoords(latitude, longitude);
    const coords: LocationCoords = { latitude, longitude, address };

    if (selectingType === 'origin') {
      setOrigin(coords);
    } else {
      setDestination(coords);
    }
    setSelectingType(null);
  };

  const handleRequestTransport = async () => {
    if (isClientBlockedFromRequest || !origin || !destination || !user || !profile) {
      return;
    }

    const originData: LocationData = {
      latitude: origin.latitude,
      longitude: origin.longitude,
      address: origin.address || '',
    };

    const destinationData: LocationData = {
      latitude: destination.latitude,
      longitude: destination.longitude,
      address: destination.address || '',
    };

    const serviceId = await createServiceRequest({
      clientId: user.uid,
      clientName: profile.name,
      origin: originData,
      destination: destinationData,
    });

    if (serviceId) {
      addNotification('service_created', serviceId, 'Pedido de transporte criado');
      setHasTripsUpdate(true);
      Alert.alert(
        'Sucesso',
        'Pedido de transporte criado! Aguarde um motorista aceitar.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/(tabs)/trips',
                params: { tab: 'pending', serviceId },
              } as any);
            },
          },
        ]
      );
      setDestination(null);
    } else {
      Alert.alert('Erro', 'Não foi possível criar o pedido. Tente novamente.');
    }
  };


  const handleGoToActiveService = () => {
    if (activeService?.id) {
      router.push({ pathname: '/(tabs)/active-service', params: { serviceId: activeService.id } } as any);
      return;
    }
    router.push('/(tabs)/active-service' as any);
  };

  if (profileLoading || modeLoading) {
    return <LoadingScreen />;
  }

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('pt-PT');
  };

  const handleAcceptService = async (service: any) => {
    if (isDriverBlocked) {
      Alert.alert('Indisponível', 'Complete o serviço atual para aceitar novos pedidos.');
      return;
    }
    if (!user || !profile || !currentLocation) {
      Alert.alert('Erro', 'Não foi possível obter a sua localização.');
      return;
    }

    if (service.status === 'negotiating') {
      Alert.alert('Indisponível', 'Este pedido já está em negociação com outro motorista.');
      return;
    }

    const estimatedTime = calculateEstimatedPickupTime(
      currentLocation.latitude,
      currentLocation.longitude,
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
              currentLocation
            );

            if (success) {
              addNotification('driver_proposed', service.id, `Proposta enviada para ${service.clientName}`);
              setHasTripsUpdate(true);
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

  const renderAvailableRequest = ({ item }: { item: any }) => {
    const isNegotiating = item.status === 'negotiating';
    const isUnavailable = isNegotiating || isDriverBlocked;
    const isActiveService = activeService?.id === item.id && activeService?.driverId === user?.uid;
    const eta = currentLocation
      ? calculateEstimatedPickupTime(
        currentLocation.latitude,
        currentLocation.longitude,
        item.origin.latitude,
        item.origin.longitude
      )
      : null;

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
            {!isUnavailable && eta && (
              <View style={styles.etaContainer}>
                <Car size={14} color="#4CAF50" />
                <Text style={styles.etaText}>{eta} min</Text>
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

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              (!isActiveService && (isUnavailable || proposeLoading || !currentLocation)) &&
                styles.acceptButtonDisabled,
            ]}
            onPress={isActiveService ? handleGoToActiveService : () => handleAcceptService(item)}
            disabled={!isActiveService && (isUnavailable || proposeLoading || !currentLocation)}
          >
            {proposeLoading && !isActiveService ? (
              <ActivityIndicator size="small" color="#0a0a0a" />
            ) : (
              <>
                <Car size={20} color={isActiveService ? '#0a0a0a' : (isUnavailable ? '#666666' : '#0a0a0a')} />
                <Text
                  style={[
                    styles.acceptButtonText,
                    !isActiveService && isUnavailable && styles.acceptButtonTextDisabled,
                  ]}
                >
                  {isActiveService ? 'Ver detalhes' : 'Aceitar serviço'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyRequests = () => (
    <View style={styles.emptyContainer}>
      <Car size={64} color="#333333" />
      <Text style={styles.emptyTitle}>Sem pedidos disponíveis</Text>
      <Text style={styles.emptySubtitle}>
        Quando houver novos pedidos de transporte, aparecerão aqui.
      </Text>
    </View>
  );

  const initialRegion = currentLocation
    ? {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
    : {
      latitude: 38.7223,
      longitude: -9.1393,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

  const commonHeader = (
    <>
      {false && (
        <View />
      )}
    </>
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

      {proposeLoading && (
        <View style={styles.proposeLoadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.proposeLoadingText}>A processar pedido...</Text>
        </View>
      )}

      {showDriverUI ? (
        <FlatList
          data={availableServices}
          renderItem={renderAvailableRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!availableLoading ? renderEmptyRequests : null}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {commonHeader}
              <View style={styles.driverSection}>
                {!locationLoading && !currentLocation && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      Não foi possível obter a sua localização. Verifique as permissões.
                    </Text>
                  </View>
                )}

                {availableError && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{availableError}</Text>
                  </View>
                )}

                {isDriverBlocked && availableServices.length > 0 && (
                  <Text style={styles.disabledHint}>
                    Complete o serviço atual para aceitar novos pedidos
                  </Text>
                )}
              </View>
            </>
          }
        />
      ) : (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {commonHeader}

          {showClientUI && (
            <View style={styles.clientSection}>
              <View style={styles.mapContainer}>
                {locationLoading ? (
                  <View style={styles.mapLoading}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.mapLoadingText}>A obter localização...</Text>
                  </View>
                ) : (
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={initialRegion}
                    onPress={handleMapPress}
                    showsUserLocation
                    showsMyLocationButton
                  >
                    {origin && (
                      <Marker
                        coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
                        pinColor="#4CAF50"
                        title="Origem"
                        description={origin.address}
                      />
                    )}
                    {destination && (
                      <Marker
                        coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
                        pinColor="#F44336"
                        title="Destino"
                        description={destination.address}
                      />
                    )}
                  </MapView>
                )}

                {isClientBlockedFromRequest && (
                  <View style={styles.pendingOverlay}>
                    <Text style={styles.pendingOverlayText}>
                      Já tens um pedido em curso. Aguarda a resposta do motorista, cancela ou termina a viagem.
                    </Text>
                  </View>
                )}

                {selectingType && (
                  <View style={styles.selectingOverlay}>
                    <Text style={styles.selectingText}>
                      Toque no mapa para selecionar {selectingType === 'origin' ? 'origem' : 'destino'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.locationInputs}>
                <TouchableOpacity
                  style={[styles.locationInput, selectingType === 'origin' && styles.locationInputActive]}
                  onPress={() => !isClientBlockedFromRequest && setSelectingType('origin')}
                  disabled={isClientBlockedFromRequest}
                >
                  <MapPin size={20} color={selectingType === 'origin' ? '#4CAF50' : '#666666'} />
                  <Text style={styles.locationInputText} numberOfLines={1}>
                    {origin?.address || 'Selecionar origem'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationInput,
                    selectingType === 'destination' && styles.locationInputActive,
                  ]}
                  onPress={() => !isClientBlockedFromRequest && setSelectingType('destination')}
                  disabled={isClientBlockedFromRequest}
                >
                  <Navigation
                    size={20}
                    color={selectingType === 'destination' ? '#F44336' : '#666666'}
                  />
                  <Text style={styles.locationInputText} numberOfLines={1}>
                    {destination?.address || 'Selecionar destino'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.mainButton,
                  (isClientBlockedFromRequest ||
                    !origin ||
                    !destination ||
                    serviceLoading) &&
                  styles.mainButtonDisabled,
                ]}
                onPress={handleRequestTransport}
                disabled={
                  isClientBlockedFromRequest ||
                  !origin ||
                  !destination ||
                  serviceLoading
                }
              >
                {serviceLoading ? (
                  <ActivityIndicator color="#0a0a0a" />
                ) : (
                  <Text style={styles.mainButtonText}>Pedir transporte</Text>
                )}
              </TouchableOpacity>

            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionedBanner: {
    backgroundColor: '#2a2a1a',
    borderWidth: 1,
    borderColor: '#ffaa00',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  conditionedTitle: {
    color: '#ffcc00',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  conditionedServiceId: {
    color: '#ccaa00',
    fontSize: 14,
    marginBottom: 8,
  },
  conditionedRoute: {
    color: '#999966',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  conditionedButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  pendingBanner: {
    backgroundColor: '#1a2a1a',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  pendingTitle: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  pendingSubtitle: {
    color: '#66aa66',
    fontSize: 14,
    marginBottom: 16,
  },
  goToServiceButton: {
    backgroundColor: '#ffaa00',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  goToServiceButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelServiceButton: {
    backgroundColor: '#2a1a1a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff6666',
  },
  modeSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  modeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#0a0a0a',
  },
  clientSection: {
    flex: 1,
    flexGrow: 1,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: height * 0.49,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    color: '#666666',
    marginTop: 12,
    fontSize: 14,
  },
  selectingOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 8,
  },
  selectingText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  pendingOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(42, 26, 26, 0.92)',
    borderWidth: 1,
    borderColor: '#ff6666',
    padding: 12,
    borderRadius: 8,
  },
  pendingOverlayText: {
    color: '#ffcccc',
    fontSize: 13,
    textAlign: 'center',
  },
  blockedBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 12,
    padding: 12,
  },
  blockedBannerText: {
    color: '#ffcccc',
    fontSize: 13,
    textAlign: 'center',
  },
  locationInputs: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  locationInputActive: {
    borderColor: '#ffffff',
  },
  locationInputText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  mainButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 24,
  },
  mainButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
  mainButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledHint: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  disabledHintSlot: {
    height: 36,
    justifyContent: 'center',
    marginTop: 12,
  },
  driverSection: {
    paddingLeft: 24,
    paddingRight: 24,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  availabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  availabilityLabel: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  driverPanel: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  driverPanelTitle: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
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
    paddingHorizontal: 0,
    paddingBottom: 24,
    flexGrow: 1,
  },
  serviceCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 24,
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
  cardActions: {
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
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
    paddingHorizontal: 0,
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
  proposeLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  proposeLoadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
});
