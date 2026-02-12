import { auth, db } from '@/api/firebaseConfig';
import { useEmailSignUp } from '@/hooks/use-email-signup';
import { UserRole } from '@/types/user';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Car, User, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const GREEN = '#4CAF50';

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');

  const { signUp, loading, emailError, passwordError, clearErrors } = useEmailSignUp();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setConfirmPasswordError(null);
    if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem');
      return;
    }

    const result = await signUp(email, password);

    if (result) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        email,
        name,
        role,
        status: 'free',
        activeServiceId: null,
        driverRating: null,
        driverRatingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await signOut(auth);
      Alert.alert(
        'Verificação enviada',
        'Enviámos um email de verificação. Confirma antes de entrares.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  };

  const handleClearErrors = () => {
    clearErrors();
    setConfirmPasswordError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.title}>Criar Conta</Text>
          </View>
        </View>

        <View style={styles.formWrapper}>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Insira o nome"
                placeholderTextColor="#444444"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputContainerWithError}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Insira o email"
                placeholderTextColor="#444444"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) handleClearErrors();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            <View style={styles.inputContainerWithError}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#444444"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) handleClearErrors();
                }}
                secureTextEntry
                autoComplete="password-new"
              />
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            </View>

            <View style={styles.inputContainerWithError}>
              <Text style={styles.label}>Confirmar senha</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#444444"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                secureTextEntry
                autoComplete="password-new"
              />
              {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
            </View>

            <View style={styles.roleSection}>
              <Text style={styles.label}>Tipo de conta</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'client' && styles.roleButtonActive]}
                  onPress={() => setRole('client')}
                >
                  <User size={24} color="#ffffff" />
                  <Text style={[styles.roleButtonText, role === 'client' && styles.roleButtonTextActive]}>
                    Cliente
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'driver' && styles.roleButtonActive]}
                  onPress={() => setRole('driver')}
                >
                  <Car size={24} color="#ffffff" />
                  <Text style={[styles.roleButtonText, role === 'driver' && styles.roleButtonTextActive]}>
                    Motorista
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'both' && styles.roleButtonActive]}
                  onPress={() => setRole('both')}
                >
                  <Users size={24} color="#ffffff" />
                  <Text style={[styles.roleButtonText, role === 'both' && styles.roleButtonTextActive]}>
                    Ambos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <Text style={styles.signUpButtonText}>Criar Conta</Text>
              )}
            </TouchableOpacity>

           

            <View style={styles.footer}>
              <Text style={styles.footerText}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
                <Text style={styles.footerLink}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    marginBottom: 0,
  },
  formWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
    marginBottom: 24,
  },
  form: {
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputContainerWithError: {
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  errorText: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    color: '#ff6666',
    fontSize: 12,
  },
  roleSection: {
    marginBottom: 32,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  roleButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  signUpButton: {
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  signUpButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  terms: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  termsLink: {
    color: GREEN,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666666',
    fontSize: 14,
  },
  footerLink: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '600',
  },
});
