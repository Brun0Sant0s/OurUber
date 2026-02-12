import { getFirebaseAuth } from '@/api/firebaseConfig';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { useState } from 'react';

export const useEmailSignIn = () => {
  const allowUnverifiedEmails = ['test@both.com', 'teste@client.com', 'teste@driver.com'];
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const signIn = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setEmailError(null);
    setPasswordError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const userEmail = (userCredential.user.email || '').toLowerCase();
      if (!userCredential.user.emailVerified && !allowUnverifiedEmails.includes(userEmail)) {
        await signOut(getFirebaseAuth());
        setEmailError('Valida o email antes de entrar');
        return null;
      }
      return userCredential.user;
    } catch (err: any) {
      const emailErrors = ['auth/invalid-email', 'auth/user-disabled', 'auth/user-not-found'];
      const passwordErrors = ['auth/wrong-password'];
      const credentialErrors = ['auth/invalid-credential'];

      if (emailErrors.includes(err.code)) {
        switch (err.code) {
          case 'auth/invalid-email':
            setEmailError('Email inválido');
            break;
          case 'auth/user-disabled':
            setEmailError('Usuário desabilitado');
            break;
          case 'auth/user-not-found':
            setEmailError('Usuário não encontrado');
            break;
        }
      } else if (passwordErrors.includes(err.code)) {
        setPasswordError('Senha incorreta');
      } else if (credentialErrors.includes(err.code)) {
        setPasswordError('Email ou senha incorretos');
      } else {
        switch (err.code) {
          case 'auth/too-many-requests':
            setPasswordError('Muitas tentativas. Tente novamente mais tarde');
            break;
          case 'auth/network-request-failed':
            setPasswordError('Erro de conexão. Verifique sua internet');
            break;
          default:
            setPasswordError(err.message || 'Erro ao fazer login');
        }
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
  };

  return { signIn, loading, emailError, passwordError, clearErrors };
};
