import { Car, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GREEN = '#4CAF50';

type AppHeaderProps = {
  username?: string | null;
  canSelectMode?: boolean;
  role?: 'client' | 'driver' | 'both';
  mode?: 'client' | 'driver';
  onChangeMode?: (mode: 'client' | 'driver') => void;
};

export default function AppHeader({
  username,
  canSelectMode = false,
  role,
  mode,
  onChangeMode,
}: AppHeaderProps) {
  const resolvedName = username || 'Utilizador';
  const staticMode =
    role === 'driver' || role === 'client'
      ? role
      : mode;

  return (
    <View style={styles.header}>
      <Text style={styles.greeting}>Olá, {resolvedName}</Text>
      {canSelectMode && mode && onChangeMode && (
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'client' && styles.modeButtonActive]}
            onPress={() => onChangeMode('client')}
            activeOpacity={0.8}
          >
            <User size={18} color={mode === 'client' ? '#ffffff' : '#666666'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'driver' && styles.modeButtonActive]}
            onPress={() => onChangeMode('driver')}
            activeOpacity={0.8}
          >
            <Car size={18} color={mode === 'driver' ? '#ffffff' : '#666666'} />
          </TouchableOpacity>
        </View>
      )}
      {!canSelectMode && staticMode && (
        <View style={styles.singleModeContainer}>
          <View style={[styles.modeButton, styles.modeButtonActive]}>
            {staticMode === 'driver' ? (
              <Car size={18} color="#ffffff" />
            ) : (
              <User size={18} color="#ffffff" />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    padding: 4,
    gap: 6,
  },
  modeButton: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: GREEN,
  },
  singleModeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    padding: 4,
  },
});
