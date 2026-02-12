import { db } from '@/api/firebaseConfig';
import { Service } from '@/types/user';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export const useActiveService = (serviceId: string | null) => {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      setService(null);
      setLoading(false);
      return;
    }

    const serviceRef = doc(db, 'services', serviceId);

    const unsubscribe = onSnapshot(
      serviceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setService({
            ...data,
            id: snapshot.id,
            driverCompleted: data.driverCompleted || false,
            clientCompleted: data.clientCompleted || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            negotiationStartedAt: data.negotiationStartedAt?.toDate() || null,
            acceptedAt: data.acceptedAt?.toDate() || null,
            completedAt: data.completedAt?.toDate() || null,
          } as Service);
        } else {
          setService(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching service:', err);
        setError('Erro ao carregar serviço');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [serviceId]);

  return { service, loading, error };
};
