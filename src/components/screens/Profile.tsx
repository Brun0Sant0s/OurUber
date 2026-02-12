import { auth } from '@/api/firebaseConfig';
import LoadingScreen from '@/components/screens/LoadingScreen';
import AppHeader from '@/components/shared/AppHeader';
import { useModeSelection } from '@/hooks/use-mode-selection';
import { useOnAuthChange } from '@/hooks/use-onauth-change';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUserTrips } from '@/hooks/use-user-trips';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from 'firebase/auth';
import {
  Car,
  CheckCircle,
  LogOut,
  MapPin,
  Star,
  User,
  X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Profile() {
  const { user } = useOnAuthChange();
  const { profile, loading, updateProfile } = useUserProfile(user?.uid || null);
  const { mode, setMode } = useModeSelection();
  const { trips: clientTrips } = useUserTrips(user?.uid || null, 'client');
  const { trips: driverTrips } = useUserTrips(user?.uid || null, 'driver');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{ name: string; email: string } | null>(null);

  const clientTotalTrips = clientTrips.length;
  const clientCompletedTrips = clientTrips.filter((trip) => trip.status === 'completed').length;
  const clientCancelledTrips = clientTrips.filter((trip) => trip.status === 'cancelled').length;
  const driverTotalTrips = driverTrips.length;

  const handleLogout = async () => {
    Alert.alert(
      'Terminar sessão',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
            } catch (err) {
              console.error('Error logging out:', err);
            }
          },
        },
      ]
    );
  };

  const handleOpenEdit = () => {
    setEditName(profile?.name || '');
    setEditEmail(profile?.email || user?.email || '');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !profile) return;

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName || !trimmedEmail) {
      Alert.alert('Dados inválidos', 'Preenche o nome e o email.');
      return;
    }

    setSaving(true);
    try {
      const currentEmail = user.email || '';
      if (trimmedEmail !== currentEmail) {
        await updateEmail(user, trimmedEmail);
      }

      await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
      });

      setIsEditOpen(false);
      Alert.alert('Atualizado', 'Dados atualizados com sucesso.');
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setPendingUpdate({ name: trimmedName, email: trimmedEmail });
        setReauthPassword('');
        setIsEditOpen(false);
        setReauthOpen(true);
      } else {
        console.error('Error updating profile:', err);
        Alert.alert(
          'Erro',
          'Não foi possível atualizar. Tenta novamente.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReauth = async () => {
    if (!user || !pendingUpdate) return;

    if (!reauthPassword.trim()) {
      Alert.alert('Dados inválidos', 'Insere a palavra-passe.');
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email || pendingUpdate.email,
        reauthPassword
      );
      await reauthenticateWithCredential(user, credential);

      const currentEmail = user.email || '';
      if (pendingUpdate.email !== currentEmail) {
        await updateEmail(user, pendingUpdate.email);
      }

      await updateProfile({
        name: pendingUpdate.name,
        email: pendingUpdate.email,
      });

      setReauthOpen(false);
      setIsEditOpen(false);
      setPendingUpdate(null);
      Alert.alert('Atualizado', 'Dados atualizados com sucesso.');
    } catch (err: any) {
      console.error('Error reauth/update profile:', err);
      Alert.alert('Erro', 'Não foi possível confirmar a sessão.');
    } finally {
      setSaving(false);
    }
  };


  const getRoleLabel = (role: string | undefined): string => {
    switch (role) {
      case 'client':
        return 'Cliente';
      case 'driver':
        return 'Motorista';
      case 'both':
        return 'Cliente e Motorista';
      default:
        return 'Não definido';
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <AppHeader
        username={profile?.name}
        canSelectMode={profile?.role === 'both'}
        role={profile?.role}
        mode={mode}
        onChangeMode={setMode}
      />

      <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={40} color="#ffffff" />
            </View>
          </View>
          <View style={[
            styles.statusIndicator,
            styles.statusBadgeTop,
            profile?.status === 'conditioned' ? styles.statusConditioned : styles.statusFree
          ]}>
            <Text style={[
              styles.statusIndicatorText,
              profile?.status === 'conditioned' ? styles.statusConditionedText : styles.statusFreeText
            ]}>
              {profile?.status === 'conditioned' ? 'Condicionado' : 'Livre'}
            </Text>
          </View>
          <Text style={styles.userName}>{profile?.name || 'Utilizador'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {profile?.email || user?.email}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(profile?.role)}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleOpenEdit}>
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>
        {(profile?.role === 'client' || profile?.role === 'both') && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Estatísticas de cliente</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MapPin size={24} color="#4CAF50" />
                <Text style={styles.statValue}>{clientTotalTrips}</Text>
                <Text style={styles.statLabel}>Viagens</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <CheckCircle size={24} color="#4CAF50" />
                <Text style={styles.statValue}>{clientCompletedTrips}</Text>
                <Text style={styles.statLabel}>Concluídas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <X size={24} color="#ff6666" />
                <Text style={styles.statValue}>{clientCancelledTrips}</Text>
                <Text style={styles.statLabel}>Canceladas</Text>
              </View>
            </View>
          </View>
        )}

        {(profile?.role === 'driver' || profile?.role === 'both') && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Estatísticas de motorista</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Star size={24} color="#FFD700" fill="#FFD700" />
                <Text style={styles.statValue}>
                  {profile?.driverRatingCount ? profile.driverRating?.toFixed(1) : '-'}
                </Text>
                <Text style={styles.statLabel}>Avaliação</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Car size={24} color="#4CAF50" />
                <Text style={styles.statValue}>{driverTotalTrips}</Text>
                <Text style={styles.statLabel}>Viagens</Text>
              </View>
            </View>
          </View>
        )}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#ffffff" />
            <Text style={styles.logoutButtonText}>Terminar sessão</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      <Modal
        visible={isEditOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome"
                placeholderTextColor="#666666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email"
                placeholderTextColor="#666666"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditOpen(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#0a0a0a" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reauthOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReauthOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar sessão</Text>
            <Text style={styles.modalSubtitle}>
              Para alterar o email, confirma a tua palavra-passe.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Palavra-passe</Text>
              <TextInput
                style={styles.input}
                value={reauthPassword}
                onChangeText={setReauthPassword}
                placeholder="Palavra-passe"
                placeholderTextColor="#666666"
                secureTextEntry
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReauthOpen(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleReauth}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#0a0a0a" />
                ) : (
                  <Text style={styles.saveButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#333333',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeTop: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  roleText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#333333',
  },
  settingsSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  modeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#0a0a0a',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: '#ffffff',
  },
  settingHint: {
    fontSize: 12,
    color: '#666666',
    marginTop: 12,
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusFree: {
    backgroundColor: '#1a3a1a',
  },
  statusConditioned: {
    backgroundColor: '#3a2a1a',
  },
  statusIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusFreeText: {
    color: '#4CAF50',
  },
  statusConditionedText: {
    color: '#ffaa00',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  logoutContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#444444',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalSubtitle: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#999999',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: '600',
  },
});









