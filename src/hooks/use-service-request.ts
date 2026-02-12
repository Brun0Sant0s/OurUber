 import { db } from '@/api/firebaseConfig';
import { CreateServiceData } from '@/types/user';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useState } from 'react';

export const useServiceRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createServiceRequest = async (data: CreateServiceData): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', data.clientId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setError('Utilizador não encontrado');
        return null;
      }
      const userData = userSnap.data();
      if (userData.status === 'conditioned' || userData.activeServiceId) {
        setError('Já tem um serviço ativo');
        return null;
      }

      const serviceData = {
        clientId: data.clientId,
        clientName: data.clientName,
        driverId: null,
        driverName: null,
        driverRating: null,
        origin: data.origin,
        destination: data.destination,
        status: 'pending',
        estimatedPickupTime: null,
        driverCompleted: false,
        clientCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        negotiationStartedAt: null,
        acceptedAt: null,
        completedAt: null,
        rating: null,
        ratingComment: null,
      };

      const servicesRef = collection(db, 'services');
      const docRef = await addDoc(servicesRef, serviceData);

      await updateDoc(userRef, {
        activeServiceId: docRef.id,
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (err: any) {
      console.error('Error creating service request:', err);
      setError('Erro ao criar pedido de transporte');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelServiceRequest = async (serviceId: string, userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const serviceRef = doc(db, 'services', serviceId);
      await updateDoc(serviceRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'free',
        activeServiceId: null,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (err: any) {
      console.error('Error cancelling service request:', err);
      setError('Erro ao cancelar pedido');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createServiceRequest, cancelServiceRequest, loading, error };
};
