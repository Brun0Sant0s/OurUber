import { NotificationType, useServiceNotifications } from '@/contexts/ServiceNotificationContext';
import { Service, ServiceStatus } from '@/types/user';
import { useEffect, useRef } from 'react';

interface UseServiceNotificationWatcherOptions {
  service: Service | null;
  userId: string | null;
  isClient: boolean;
}

export function useServiceNotificationWatcher({
  service,
  userId,
  isClient,
}: UseServiceNotificationWatcherOptions) {
  const { addNotification, setHasActiveServiceUpdate } = useServiceNotifications();
  // guardar o estado anterior pra comparar e so notificar qd muda
  const previousStatusRef = useRef<ServiceStatus | null>(null);
  const previousDriverCompletedRef = useRef<boolean | undefined>(undefined);
  const previousClientCompletedRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!service || !userId) return;

    const previousStatus = previousStatusRef.current;
    const previousDriverCompleted = previousDriverCompletedRef.current;
    const previousClientCompleted = previousClientCompletedRef.current;

    if (previousStatus === null) {
      previousStatusRef.current = service.status;
      previousDriverCompletedRef.current = service.driverCompleted;
      previousClientCompletedRef.current = service.clientCompleted;
      return;
    }

    if (previousStatus !== service.status) {
      let notificationType: NotificationType | null = null;
      let message = '';

      if (isClient) {
        switch (service.status) {
          case 'negotiating':
            if (previousStatus === 'pending') {
              notificationType = 'driver_proposed';
              message = `${service.driverName} propôs aceitar o seu pedido`;
            }
            break;
          case 'accepted':
            notificationType = 'client_accepted';
            message = 'O motorista está a caminho';
            break;
          case 'in_progress':
            notificationType = 'trip_started';
            message = 'A viagem começou';
            break;
          case 'completed':
            notificationType = 'service_completed';
            message = 'Viagem concluída';
            break;
          case 'cancelled':
            notificationType = 'service_cancelled';
            message = 'Serviço cancelado';
            break;
          case 'expired':
            notificationType = 'service_expired';
            message = 'O tempo de resposta expirou';
            break;
        }
      } else {
        switch (service.status) {
          case 'accepted':
            if (previousStatus === 'negotiating') {
              notificationType = 'client_accepted';
              message = `${service.clientName} aceitou a sua proposta`;
            }
            break;
          case 'pending':
            if (previousStatus === 'negotiating') {
              notificationType = 'client_rejected';
              message = `${service.clientName} rejeitou a proposta`;
            }
            break;
          case 'in_progress':
            notificationType = 'trip_started';
            message = 'Viagem iniciada';
            break;
          case 'completed':
            notificationType = 'service_completed';
            message = 'Viagem concluída';
            break;
          case 'cancelled':
            notificationType = 'service_cancelled';
            message = 'Serviço cancelado pelo cliente';
            break;
          case 'expired':
            notificationType = 'service_expired';
            message = 'O tempo de resposta expirou';
            break;
        }
      }

      if (notificationType && message) {
        addNotification(notificationType, service.id, message);
        setHasActiveServiceUpdate(true);
      }
    }

    if (isClient && service.driverCompleted && !previousDriverCompleted) {
      addNotification('driver_completed', service.id, 'O motorista marcou a viagem como concluída');
      setHasActiveServiceUpdate(true);
    }

    if (!isClient && service.clientCompleted && !previousClientCompleted) {
      addNotification('client_completed', service.id, 'O cliente confirmou a conclusão da viagem');
      setHasActiveServiceUpdate(true);
    }

    previousStatusRef.current = service.status;
    previousDriverCompletedRef.current = service.driverCompleted;
    previousClientCompletedRef.current = service.clientCompleted;
  }, [service, userId, isClient, addNotification, setHasActiveServiceUpdate]);
}


export function useNotifyServiceAction() {
  const { addNotification, setHasTripsUpdate } = useServiceNotifications();

  const notifyServiceCreated = (serviceId: string) => {
    addNotification('service_created', serviceId, 'Pedido de transporte criado');
    setHasTripsUpdate(true);
  };

  return {
    notifyServiceCreated,
  };
}
