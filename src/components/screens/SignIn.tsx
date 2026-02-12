import { useEmailSignIn } from '@/hooks/use-email-signin';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, loading, emailError, passwordError, clearErrors } = useEmailSignIn();

  const handleSignIn = async () => {
    const result = await signIn(email, password);
    if (result) {
      // Navegação será feita pelo onAuthStateChanged
    }
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
            <Text style={styles.title}>Entrar</Text>
          </View>
        </View>

        <View style={styles.formWrapper}>
          <Text style={styles.subtitle}>Bem-vindo de volta</Text>
          <View style={styles.form}>
          <View style={styles.inputContainerWithError}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Insira o email"
              placeholderTextColor="#444444"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError || passwordError) clearErrors();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <View style={styles.inputContainerWithError}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#444444"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (emailError || passwordError) clearErrors();
                }}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#ffffff" />
                ) : (
                  <Eye size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
            {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>Recuperar password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.signInButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

         

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.footerLink}>Criar</Text>
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorText: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    color: '#ff6666',
    fontSize: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: GREEN,
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  signInButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
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
  quickLoginContainer: {
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  quickLoginLabel: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickLoginButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickLoginButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickLoginClient: {
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  quickLoginDriver: {
    backgroundColor: '#1a2a3a',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  quickLoginBoth: {
    backgroundColor: '#3a2a1a',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  quickLoginButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
