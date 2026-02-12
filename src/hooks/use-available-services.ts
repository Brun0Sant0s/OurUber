import { db } from '@/api/firebaseConfig';
import { Service } from '@/types/user';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

export const useAvailableServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const servicesRef = collection(db, 'services');
    // so mostra ao motorista pedidos pendentes ou em negociacao 
    const q = query(
      servicesRef,
      where('status', 'in', ['pending', 'negotiating']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const servicesData: Service[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            driverCompleted: data.driverCompleted || false,
            clientCompleted: data.clientCompleted || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            negotiationStartedAt: data.negotiationStartedAt?.toDate() || null,
            acceptedAt: data.acceptedAt?.toDate() || null,
            completedAt: data.completedAt?.toDate() || null,
          } as Service;
        });
        setServices(servicesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching available services:', err);
        setError('Erro ao carregar serviços disponíveis');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { services, loading, error };
};
