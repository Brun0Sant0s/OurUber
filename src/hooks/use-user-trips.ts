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

export const useUserTrips = (
  userId: string | null,
  mode: 'client' | 'driver' | null
) => {
  const [trips, setTrips] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !mode) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const servicesRef = collection(db, 'services');

    // filtra por clientId ou driverId conforme o modo
    const fieldToQuery = mode === 'client' ? 'clientId' : 'driverId';
    const q = query(
      servicesRef,
      where(fieldToQuery, '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tripsData: Service[] = snapshot.docs.map((doc) => {
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
        setTrips(tripsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user trips:', err);
        setError('Erro ao carregar viagens');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, mode]);

  return { trips, loading, error };
};
