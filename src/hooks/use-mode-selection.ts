import { UserMode } from '@/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

const MODE_STORAGE_KEY = '@ouruber_user_mode';

export const useModeSelection = (defaultMode: UserMode = 'client') => {
  const [mode, setModeState] = useState<UserMode>(defaultMode);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMode();
  }, []);

  // recarregar quando o user volta a este ecra
  useFocusEffect(
    useCallback(() => {
      loadMode();
    }, [])
  );

  const loadMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY);
      if (savedMode === 'client' || savedMode === 'driver') {
        setModeState(savedMode);
      }
    } catch (err) {
      console.error('Error loading mode:', err);
    } finally {
      setLoading(false);
    }
  };

  const setMode = async (newMode: UserMode) => {
    try {
      await AsyncStorage.setItem(MODE_STORAGE_KEY, newMode);
      setModeState(newMode);
    } catch (err) {
      console.error('Error saving mode:', err);
      throw new Error('Erro ao salvar modo');
    }
  };

  return { mode, loading, setMode };
};
