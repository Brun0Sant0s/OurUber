import { db } from '@/api/firebaseConfig';
import { calculateEstimatedPickupTime } from '@/utils/distance';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useState } from 'react';

export const useServiceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proposeService = async (
    serviceId: string,
    driverId: string,
    driverName: string,
    driverRating: number | null,
    driverLocation: { latitude: number; longitude: number }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      const serviceSnap = await getDoc(serviceRef);

      if (!serviceSnap.exists()) {
        setError('Serviço não encontrado');
        return false;
      }

      const serviceData = serviceSnap.data();
      if (serviceData.status !== 'pending') {
        setError('Este serviço já não está disponível');
        return false;
      }
      const driverRef = doc(db, 'users', driverId);
      const driverSnap = await getDoc(driverRef);
      if (!driverSnap.exists()) {
        setError('Motorista não encontrado');
        return false;
      }
      const driverData = driverSnap.data();
      // verificar se o driver ja ta ocupado noutro servico
      if (driverData.status === 'conditioned' || driverData.activeServiceId) {
        let canOverrideClientRequest = false;

        if (driverData.activeServiceId) {
          const activeServiceRef = doc(db, 'services', driverData.activeServiceId);
          const activeServiceSnap = await getDoc(activeServiceRef);

          if (activeServiceSnap.exists()) {
            const activeServiceData = activeServiceSnap.data();
            const isClientOwnRequest =
              activeServiceData.clientId === driverId && !activeServiceData.driverId;
            const isPendingClientRequest = activeServiceData.status === 'pending';
            canOverrideClientRequest = isClientOwnRequest && isPendingClientRequest;
          }
        }

        if (!canOverrideClientRequest) {
          setError('Motorista indisponível');
          return false;
        }
      }

      const estimatedPickupTime = calculateEstimatedPickupTime(
        driverLocation.latitude,
        driverLocation.longitude,
        serviceData.origin.latitude,
        serviceData.origin.longitude
      );

      // atualizar servico, driver e cliente
      await updateDoc(serviceRef, {
        driverId,
        driverName,
        driverRating,
        estimatedPickupTime,
        status: 'negotiating',
        negotiationStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(driverRef, {
        status: 'conditioned',
        activeServiceId: serviceId,
        updatedAt: serverTimestamp(),
      });

      const clientRef = doc(db, 'users', serviceData.clientId);
      await updateDoc(clientRef, {
        status: 'conditioned',
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (err: any) {
      console.error('Error proposing service:', err);
      setError('Erro ao propor serviço');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const acceptProposal = async (serviceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      await updateDoc(serviceRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (err: any) {
      console.error('Error accepting proposal:', err);
      setError('Erro ao aceitar proposta');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startService = async (serviceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      await updateDoc(serviceRef, {
        status: 'in_progress',
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (err: any) {
      console.error('Error starting service:', err);
      setError('Erro ao iniciar viagem');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // rejeitar limpa tudo e volta ao estado inicial
  const rejectProposal = async (
    serviceId: string,
    driverId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      const serviceSnap = await getDoc(serviceRef);

      if (!serviceSnap.exists()) {
        setError('Serviço não encontrado');
        return false;
      }

      const serviceData = serviceSnap.data();

      await updateDoc(serviceRef, {
        status: 'pending',
        driverId: null,
        driverName: null,
        driverRating: null,
        estimatedPickupTime: null,
        negotiationStartedAt: null,
        acceptedAt: null,
        updatedAt: serverTimestamp(),
      });

      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, {
        status: 'free',
        activeServiceId: null,
        updatedAt: serverTimestamp(),
      });

      const clientRef = doc(db, 'users', serviceData.clientId);
      await updateDoc(clientRef, {
        status: 'free',
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (err: any) {
      console.error('Error rejecting proposal:', err);
      setError('Erro ao rejeitar proposta');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // qd o timeout de 3min acaba apaga o servico
  const expireService = async (
    serviceId: string,
    clientId: string,
    driverId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      await deleteDoc(serviceRef);

      const clientRef = doc(db, 'users', clientId);
      await updateDoc(clientRef, {
        status: 'free',
        activeServiceId: null,
        updatedAt: serverTimestamp(),
      });

      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, {
        status: 'free',
        activeServiceId: null,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (err: any) {
      console.error('Error expiring service:', err);
      setError('Erro ao expirar serviço');
      return false;
    } finally {
      setLoading(false);
    }
  };


  // so fica "completed" qd os dois confirmam
  const driverCompleteService = async (serviceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      const serviceSnap = await getDoc(serviceRef);

      if (!serviceSnap.exists()) {
        setError('Serviço não encontrado');
        return false;
      }

      const serviceData = serviceSnap.data();

      await updateDoc(serviceRef, {
        driverCompleted: true,
        updatedAt: serverTimestamp(),
      });

      if (serviceData.clientCompleted) {
        await updateDoc(serviceRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const clientRef = doc(db, 'users', serviceData.clientId);
        await updateDoc(clientRef, {
          status: 'free',
          activeServiceId: null,
          updatedAt: serverTimestamp(),
        });

        const driverRef = doc(db, 'users', serviceData.driverId);
        await updateDoc(driverRef, {
          status: 'free',
          activeServiceId: null,
          updatedAt: serverTimestamp(),
        });
      }

      return true;
    } catch (err: any) {
      console.error('Error completing service (driver):', err);
      setError('Erro ao marcar como concluído');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clientCompleteService = async (
    serviceId: string,
    driverId: string,
    rating: number,
    comment?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      const serviceSnap = await getDoc(serviceRef);

      if (!serviceSnap.exists()) {
        setError('Serviço não encontrado');
        return false;
      }

      const serviceData = serviceSnap.data();

      await updateDoc(serviceRef, {
        clientCompleted: true,
        rating,
        ratingComment: comment || null,
        updatedAt: serverTimestamp(),
      });

      const driverRef = doc(db, 'users', driverId);
      const driverSnap = await getDoc(driverRef);

      // recalcular a media do rating do motorista
      if (driverSnap.exists()) {
        const driverData = driverSnap.data();
        const currentRating = driverData.driverRating || 0;
        const currentCount = driverData.driverRatingCount || 0;

        const newCount = currentCount + 1;
        const newRating = (currentRating * currentCount + rating) / newCount;

        await updateDoc(driverRef, {
          driverRating: newRating,
          driverRatingCount: newCount,
          updatedAt: serverTimestamp(),
        });
      }

      if (serviceData.driverCompleted) {
        await updateDoc(serviceRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const clientRef = doc(db, 'users', serviceData.clientId);
        await updateDoc(clientRef, {
          status: 'free',
          activeServiceId: null,
          updatedAt: serverTimestamp(),
        });

        await updateDoc(driverRef, {
          status: 'free',
          activeServiceId: null,
          updatedAt: serverTimestamp(),
        });
      }

      return true;
    } catch (err: any) {
      console.error('Error completing service (client):', err);
      setError('Erro ao marcar como concluído');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelService = async (
    serviceId: string,
    clientId: string,
    driverId: string | null
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      await updateDoc(serviceRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });

      const clientRef = doc(db, 'users', clientId);
      await updateDoc(clientRef, {
        status: 'free',
        activeServiceId: null,
        updatedAt: serverTimestamp(),
      });

      if (driverId) {
        const driverRef = doc(db, 'users', driverId);
        await updateDoc(driverRef, {
          status: 'free',
          activeServiceId: null,
          updatedAt: serverTimestamp(),
        });
      }

      return true;
    } catch (err: any) {
      console.error('Error cancelling service:', err);
      setError('Erro ao cancelar serviço');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { proposeService, acceptProposal, rejectProposal, startService, driverCompleteService, clientCompleteService, cancelService, expireService, loading, error };
};
