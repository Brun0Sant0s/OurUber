import { auth } from '@/api/firebaseConfig';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useEffect, useState } from 'react';

export const useOnAuthChange = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // ELIMINAR NO FINAL - contas de teste para lo9gin
  const allowUnverifiedEmails = ['test@both.com', 'teste@client.com', 'teste@driver.com'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userEmail = (currentUser.email || '').toLowerCase();
      if (!currentUser.emailVerified && !allowUnverifiedEmails.includes(userEmail)) {
        signOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};
