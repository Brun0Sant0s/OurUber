import { auth } from '@/api/firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, UserCredential } from 'firebase/auth';
import { useState } from 'react';

export const useEmailSignUp = () => {
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const signUp = async (email: string, password: string): Promise<UserCredential | null> => {
    setLoading(true);
    setEmailError(null);
    setPasswordError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      return userCredential;
    } catch (err: any) {
      const emailErrors = ['auth/email-already-in-use', 'auth/invalid-email'];
      const passwordErrors = ['auth/weak-password'];

      if (emailErrors.includes(err.code)) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setEmailError('Este email já está em uso');
            break;
          case 'auth/invalid-email':
            setEmailError('Email inválido');
            break;
        }
      } else if (passwordErrors.includes(err.code)) {
        setPasswordError('A senha deve ter pelo menos 6 caracteres');
      } else {
        switch (err.code) {
          case 'auth/operation-not-allowed':
            setPasswordError('Operação não permitida');
            break;
          case 'auth/network-request-failed':
            setPasswordError('Erro de conexão. Verifique sua internet');
            break;
          case 'auth/too-many-requests':
            setPasswordError('Muitas tentativas. Tente novamente mais tarde');
            break;
          default:
            setPasswordError(err.message || 'Erro ao criar conta');
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

  return { signUp, loading, emailError, passwordError, clearErrors };
};
