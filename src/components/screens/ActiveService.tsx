import AppHeader from '@/components/shared/AppHeader';
import { useServiceNotifications } from '@/contexts/ServiceNotificationContext';
import { useActiveService } from '@/hooks/use-active-service';
import { useModeSelection } from '@/hooks/use-mode-selection';
import { useOnAuthChange } from '@/hooks/use-onauth-change';
import { useServiceManagement } from '@/hooks/use-service-management';
import { useServiceNotificationWatcher } from '@/hooks/use-service-notifications';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Car,
  Check,
  CheckCircle,
  MapPin,
  Navigation,
  Star,
  User,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const NEGOTIATION_TIMEOUT = 3 * 60 * 1000; // 3 min pra responder

export default function ActiveService() {
  const router = useRouter();
  const { user } = useOnAuthChange();
  const { profile } = useUserProfile(user?.uid || null);
  const { mode, setMode } = useModeSelection();
  const params = useLocalSearchParams<{ serviceId?: string }>();
  const { service, loading } = useActiveService((params.serviceId as string) || profile?.activeServiceId || null);
  const {
    acceptProposal,
    rejectProposal,
    startService,
    driverCompleteService,
    clientCompleteService,
    cancelService,
    expireService,
    loading: actionLoading,
  } = useServiceManagement();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  const isClient =
    profile?.role === 'client' || (profile?.role === 'both' && mode === 'client');
  const isDriver =
    profile?.role === 'driver' || (profile?.role === 'both' && mode === 'driver');

  const { setHasActiveServiceUpdate } = useServiceNotifications();

  useServiceNotificationWatcher({
    service,
    userId: user?.uid || null,
    isClient,
  });

  const handleBack = () => {
    router.replace('/(tabs)/trips' as any);
  };

  const goToTrips = (tab?: 'active' | 'pending' | 'completed' | 'cancelled') => {
    router.replace({ pathname: '/(tabs)/trips', params: { tab } } as any);
  };

  // se o cliente nao responder em 3min expira
  useEffect(() => {
    if (service?.status === 'negotiating' && service.negotiationStartedAt) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - service.negotiationStartedAt!.getTime();
        const remaining = NEGOTIATION_TIMEOUT - elapsed;

        if (remaining <= 0) {
          clearInterval(interval);
          handleExpireService();
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [service?.status, service?.negotiationStartedAt]);

  useEffect(() => {
    if (!service || !user || profile?.role !== 'both') return;
    if (mode !== 'driver') return;
    if (service.clientId !== user.uid) return;

    const isClientOnlyService = !service.driverId || service.driverId !== user.uid;
    if (isClientOnlyService) {
      router.replace('/(tabs)' as any);
    }
  }, [mode, profile?.role, service, user, router]);

  const handleExpireService = async () => {
    if (!service || !service.driverId) return;

    await expireService(service.id, service.clientId, service.driverId);
    Alert.alert(
      'Tempo esgotado',
      'O pedido expirou porque não houve resposta em 3 minutos.',
      [{ text: 'OK', onPress: () => goToTrips('cancelled') }]
    );
  };

  const handleAcceptProposal = async () => {
    if (!service) return;

    const success = await acceptProposal(service.id);
    if (success) {
      Alert.alert('Proposta aceite', 'O motorista está a caminho!');
    }
  };

  const handleRejectProposal = async () => {
    if (!service || !service.driverId) return;

    Alert.alert(
      'Rejeitar proposta',
      'Tem certeza que deseja rejeitar este motorista? O pedido será cancelado.',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, rejeitar',
          style: 'destructive',
          onPress: async () => {
            const success = await rejectProposal(service.id, service.driverId!);
            if (success) {
              Alert.alert('Pedido cancelado', 'O pedido foi cancelado.');
              goToTrips('cancelled');
            }
          },
        },
      ]
    );
  };

  const handleStartService = async () => {
    if (!service) return;

    Alert.alert(
      'Iniciar viagem',
      'Confirma que vai iniciar a viagem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            const success = await startService(service.id);
            if (success) {
              Alert.alert('Viagem iniciada', 'A viagem está em andamento!');
            }
          },
        },
      ]
    );
  };

  const handleDriverComplete = async () => {
    if (!service) return;

    Alert.alert(
      'Confirmar conclusão',
      'Confirma que a viagem foi concluída?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const success = await driverCompleteService(service.id);
            if (success) {
              if (service.clientCompleted) {
                Alert.alert('Serviço concluído', 'O serviço foi finalizado com sucesso!', [
                  { text: 'OK', onPress: () => goToTrips('completed') },
                ]);
              } else {
                Alert.alert('Aguardando cliente', 'Aguarde o cliente confirmar a conclusão.');
              }
            }
          },
        },
      ]
    );
  };

  // abre o modal de avaliacao qd o cliente confirma
  const handleClientComplete = () => {
    if (!service) return;
    setSelectedRating(0);
    setShowRatingModal(true);
  };

  // enviar avaliacao e atualizar a media do motorista
  const handleSubmitRating = async () => {
    if (!service || !service.driverId || selectedRating === 0) return;

    const success = await clientCompleteService(
      service.id,
      service.driverId,
      selectedRating
    );

    if (success) {
      setShowRatingModal(false);
      if (service.driverCompleted) {
        Alert.alert('Serviço concluído', 'Obrigado pela avaliação!', [
          { text: 'OK', onPress: () => goToTrips('completed') },
        ]);
      } else {
        Alert.alert('Avaliação enviada', 'Aguarde o motorista confirmar a conclusão.');
      }
    }
  };

  const handleCancelService = async () => {
    if (!service) return;

    Alert.alert(
      'Cancelar serviço',
      'Tem certeza que deseja cancelar este serviço?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelService(
              service.id,
              service.clientId,
              service.driverId
            );
            if (success) {
              Alert.alert('Serviço cancelado', 'Encontre esta viagem na aba "Canceladas."', [
                { text: 'OK', onPress: () => goToTrips('cancelled') },
              ]);
            }
          },
        },
      ]
    );
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (service?.status) {
      case 'pending':
        return 'Pendente';
      case 'negotiating':
        return 'Pendente';
      case 'accepted':
        return 'Pendente';
      case 'in_progress':
        return 'Em progresso';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      case 'expired':
        return 'Expirado';
      default:
        return '';
    }
  };

  const isTerminalStatus =
    service?.status === 'cancelled' ||
    service?.status === 'expired' ||
    service?.status === 'completed';

  const getTerminalMessage = () => {
    switch (service?.status) {
      case 'completed':
        return 'Viagem concluí­da com sucesso.';
      case 'expired':
        return 'O pedido expirou por falta de resposta.';
      case 'cancelled':
        return 'Este serviço foi cancelado.';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Serviço ativo</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Car size={64} color="#333333" />
          <Text style={styles.emptyTitle}>Sem serviço ativo</Text>
          <Text style={styles.emptySubtitle}>
            Não tem nenhum serviço em andamento.
          </Text>
        </View>
      </View>
    );
  }

  return (
      <View style={styles.container}>
      <AppHeader
        username={profile?.name}
        canSelectMode={profile?.role === 'both'}
        role={profile?.role}
        mode={mode}
        onChangeMode={setMode}
      />

      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.screenHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Detalhes da viagem</Text>
          </View>

          {isTerminalStatus && (
            <View style={styles.statusCard}>
              <View style={styles.statusIcon}>
                {service.status === 'completed' ? (
                  <CheckCircle size={20} color="#4CAF50" />
                ) : (
                  <X size={20} color="#ff6666" />
                )}
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusTitle}>{getStatusText()}</Text>
                <Text style={styles.statusSubtitle}>{getTerminalMessage()}</Text>
              </View>
            </View>
          )}


          <View>
            {service.status !== 'pending' && (
              <View style={styles.personCard}>
                <View style={styles.personInfo}>
                  <View style={styles.personAvatar}>
                    {isClient ? (
                      <Car size={24} color="#ffffff" />
                    ) : (
                      <User size={24} color="#ffffff" />
                    )}
                  </View>
                  <View style={styles.personDetails}>
                    <Text style={styles.personName}>
                      {isClient ? service.driverName : service.clientName}
                    </Text>
                    {isClient && service.driverRating && (
                      <View style={styles.ratingRow}>
                        <Star size={16} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>
                          {service.driverRating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {service.estimatedPickupTime && (service.status === 'negotiating' || service.status === 'accepted') && (
                  <View style={styles.pickupTimeContainer}>
                    <Text style={styles.pickupTimeLabel}>Tempo de recolha</Text>
                    <Text style={styles.pickupTimeValue}>
                      {service.estimatedPickupTime} min
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.routeCard}>
              <View style={styles.routeItem}>
                <View style={[styles.routeIcon, styles.routeIconOrigin]}>
                  <MapPin size={16} color="#ffffff" />
                </View>
                <View style={styles.routeDetails}>
                  <Text style={styles.routeLabel}>Origem</Text>
                  <Text style={styles.routeAddress} numberOfLines={2}>
                    {service.origin.address}
                  </Text>
                </View>
              </View>

              <View style={styles.routeDivider} />

              <View style={styles.routeItem}>
                <View style={[styles.routeIcon, styles.routeIconDestination]}>
                  <Navigation size={16} color="#ffffff" />
                </View>
                <View style={styles.routeDetails}>
                  <Text style={styles.routeLabel}>Destino</Text>
                  <Text style={styles.routeAddress} numberOfLines={2}>
                    {service.destination.address}
                  </Text>
                </View>
              </View>
            </View>

            {service.status === 'in_progress' && (
              <View style={styles.completionStatus}>
                <View style={styles.completionItem}>
                  <CheckCircle
                    size={20}
                    color={service.driverCompleted ? '#4CAF50' : '#666666'}
                  />
                  <Text
                    style={[
                      styles.completionText,
                      service.driverCompleted && styles.completionTextDone,
                    ]}
                  >
                    Motorista {service.driverCompleted ? 'confirmou' : 'pendente'}
                  </Text>
                </View>
                <View style={styles.completionItem}>
                  <CheckCircle
                    size={20}
                    color={service.clientCompleted ? '#4CAF50' : '#666666'}
                  />
                  <Text
                    style={[
                      styles.completionText,
                      service.clientCompleted && styles.completionTextDone,
                    ]}
                  >
                    Cliente {service.clientCompleted ? 'confirmou' : 'pendente'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.actionsContainer}>
        {isClient && service.status === 'negotiating' && (
          <View style={styles.negotiationActions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleRejectProposal}
              disabled={actionLoading}
            >
              <X size={24} color="#ff6666" />
              <Text style={styles.rejectButtonText}>Rejeitar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptProposal}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <>
                  <Check size={24} color="#0a0a0a" />
                  <Text style={styles.acceptButtonText}>Aceitar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isDriver && service.status === 'negotiating' && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="small" color="#ffaa00" />
            <Text style={styles.waitingText}>
              Aguardando o cliente aceitar a proposta...
            </Text>
          </View>
        )}

        {isDriver && service.status === 'accepted' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartService}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.primaryButtonText}>Iniciar viagem</Text>
            )}
          </TouchableOpacity>
        )}

        {isClient && service.status === 'accepted' && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.waitingText}>
              Motorista a caminho...
            </Text>
          </View>
        )}

        {isDriver && service.status === 'in_progress' && !service.driverCompleted && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleDriverComplete}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.primaryButtonText}>Marcar como concluído</Text>
            )}
          </TouchableOpacity>
        )}

        {isClient &&
          service.status === 'in_progress' &&
          service.driverCompleted &&
          !service.clientCompleted && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleClientComplete}
            disabled={actionLoading}
          >
            <Text style={styles.primaryButtonText}>Confirmar conclusão e avaliar</Text>
          </TouchableOpacity>
        )}

        {((isDriver && service.driverCompleted && !service.clientCompleted) ||
          (isClient && service.clientCompleted && !service.driverCompleted)) && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.waitingText}>
              Aguardando {isDriver ? 'cliente' : 'motorista'} confirmar...
            </Text>
          </View>
        )}
        {isClient && service.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelService}
            disabled={actionLoading}
          >
            <Text style={styles.cancelButtonText}>Cancelar serviço</Text>
          </TouchableOpacity>
        )}

        {isTerminalStatus && (
          <View style={styles.terminalActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => goToTrips(service.status === 'completed' ? 'completed' : 'cancelled')}
            >
              <Text style={styles.primaryButtonText}>Voltar às viagens</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </View>

      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Avaliar motorista</Text>
            <Text style={styles.modalSubtitle}>
              Como foi a sua experiência com {service.driverName}?
            </Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                >
                  <Star
                    size={48}
                    color="#FFD700"
                    fill={star <= selectedRating ? '#FFD700' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.submitRatingButton,
                selectedRating === 0 && styles.submitRatingButtonDisabled,
              ]}
              onPress={handleSubmitRating}
              disabled={selectedRating === 0 || actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <Text style={styles.submitRatingButtonText}>
                  Enviar avaliação
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222222',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusSubtitle: {
    color: '#999999',
    fontSize: 12,
    marginTop: 2,
  },

  content: {
    flex: 1,
  },
  personCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personDetails: {
    gap: 4,
  },
  personName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  pickupTimeContainer: {
    alignItems: 'flex-end',
  },
  pickupTimeLabel: {
    color: '#666666',
    fontSize: 12,
  },
  pickupTimeValue: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '700',
  },
  routeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
    marginBottom: 12,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeIconOrigin: {
    backgroundColor: '#4CAF50',
  },
  routeIconDestination: {
    backgroundColor: '#F44336',
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 2,
  },
  routeAddress: {
    color: '#ffffff',
    fontSize: 13,
  },
  routeDivider: {
    width: 2,
    height: 24,
    backgroundColor: '#333333',
    marginLeft: 15,
    marginVertical: 8,
  },
  completionStatus: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
    gap: 12,
    marginBottom: 12,
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completionText: {
    color: '#666666',
    fontSize: 13,
  },
  completionTextDone: {
    color: '#4CAF50',
  },
  actionsContainer: {
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  terminalActions: {
    gap: 8,
  },
  terminalHint: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },

  negotiationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#ff6666',
    paddingVertical: 16,
    borderRadius: 12,
  },
  rejectButtonText: {
    color: '#ff6666',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  waitingText: {
    color: '#999999',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0a0a0a',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  submitRatingButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  submitRatingButtonDisabled: {
    backgroundColor: '#333333',
  },
  submitRatingButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
});
