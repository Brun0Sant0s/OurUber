import { Service } from '@/types/user';
import React, { createContext, useCallback, useContext, useState } from 'react';

export type NotificationType =
  | 'service_created'
  | 'driver_proposed'
  | 'client_accepted'
  | 'client_rejected'
  | 'trip_started'
  | 'driver_completed'
  | 'client_completed'
  | 'service_completed'
  | 'service_cancelled'
  | 'service_expired';

export interface ServiceNotification {
  id: string;
  type: NotificationType;
  serviceId: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export type ActionRequiredType =
  | 'client_respond_proposal'
  | 'driver_start_trip'
  | 'driver_complete'
  | 'client_rate'
  | null;

interface ServiceNotificationContextType {
  notifications: ServiceNotification[];
  unreadCount: number;
  hasActiveServiceUpdate: boolean;
  hasTripsUpdate: boolean;
  actionRequired: ActionRequiredType;
  addNotification: (type: NotificationType, serviceId: string, message: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setHasActiveServiceUpdate: (value: boolean) => void;
  setHasTripsUpdate: (value: boolean) => void;
  updateActionRequired: (service: Service | null, isClient: boolean) => void;
}

const ServiceNotificationContext = createContext<ServiceNotificationContextType | undefined>(undefined);

export function ServiceNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ServiceNotification[]>([]);
  const [hasActiveServiceUpdate, setHasActiveServiceUpdate] = useState(false);
  const [hasTripsUpdate, setHasTripsUpdate] = useState(false);
  const [actionRequired, setActionRequired] = useState<ActionRequiredType>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // açoes q o user precisa de fazer dependendo do estado do servico
  const updateActionRequired = useCallback((service: Service | null, isClient: boolean) => {
    if (!service) {
      setActionRequired(null);
      return;
    }

    if (isClient) {
      if (service.status === 'negotiating') {
        setActionRequired('client_respond_proposal');
      } else if (service.status === 'in_progress' && service.driverCompleted && !service.clientCompleted) {
        setActionRequired('client_rate');
      } else {
        setActionRequired(null);
      }
    } else {
      if (service.status === 'accepted') {
        setActionRequired('driver_start_trip');
      } else if (service.status === 'in_progress' && !service.driverCompleted) {
        setActionRequired('driver_complete');
      } else {
        setActionRequired(null);
      }
    }
  }, []);

  const addNotification = useCallback((type: NotificationType, serviceId: string, message: string) => {
    const newNotification: ServiceNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      serviceId,
      message,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    const activeServiceTypes: NotificationType[] = [
      'driver_proposed',
      'client_accepted',
      'trip_started',
      'driver_completed',
      'client_completed',
    ];

    if (activeServiceTypes.includes(type)) {
      setHasActiveServiceUpdate(true);
    }

    setHasTripsUpdate(true);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setHasTripsUpdate(false);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setHasActiveServiceUpdate(false);
    setHasTripsUpdate(false);
  }, []);

  return (
    <ServiceNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        hasActiveServiceUpdate,
        hasTripsUpdate,
        actionRequired,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        setHasActiveServiceUpdate,
        setHasTripsUpdate,
        updateActionRequired,
      }}
    >
      {children}
    </ServiceNotificationContext.Provider>
  );
}

export function useServiceNotifications() {
  const context = useContext(ServiceNotificationContext);
  if (context === undefined) {
    throw new Error('useServiceNotifications must be used within a ServiceNotificationProvider');
  }
  return context;
}
