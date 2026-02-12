import { db } from '@/api/firebaseConfig';
import { UserProfile } from '@/types/user';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export const useUserProfile = (uid: string | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile({
            ...data,
            uid: snapshot.id,
            driverRatingCount: data.driverRatingCount || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user profile:', err);
        setError('Erro ao carregar perfil');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!uid) return;

    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { ...data, updatedAt: new Date() }, { merge: true });
    } catch (err) {
      console.error('Error updating profile:', err);
      throw new Error('Erro ao atualizar perfil');
    }
  };

  const createProfile = async (userId: string, email: string, name: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newProfile: Omit<UserProfile, 'uid'> = {
        email,
        name,
        role: 'client',
        status: 'free',
        activeServiceId: null,
        driverRating: null,
        driverRatingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(userRef, newProfile);
    } catch (err) {
      console.error('Error creating profile:', err);
      throw new Error('Erro ao criar perfil');
    }
  };

  return { profile, loading, error, updateProfile, createProfile };
};
