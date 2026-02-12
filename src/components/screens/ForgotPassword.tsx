import { usePasswordReset } from '@/hooks/use-password-reset';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
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

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const { resetPassword, loading, error, success, clearError } = usePasswordReset();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      return;
    }

    const result = await resetPassword(email);

    if (result) {
      setTimeout(() => {
        router.back();
      }, 3000);
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
            <Text style={styles.title}>Recuperar Senha</Text>
          </View>
        </View>

        <View style={styles.formWrapper}>
          <Text style={styles.subtitle}>
            Digite seu email e enviaremos instruções para redefinir sua senha
          </Text>
          <View style={styles.form}>
          <View style={styles.inputContainerWithError}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#444444"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading && !success}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {success && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                ✓ Email enviado com sucesso!
              </Text>
              <Text style={styles.successSubtext}>
                Verifique sua caixa de entrada e spam. Redirecionando...
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.resetButton,
              (loading || success || !email.trim()) && styles.resetButtonDisabled,
            ]}
            onPress={handleResetPassword}
            activeOpacity={0.8}
            disabled={loading || success || !email.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.resetButtonText}>
                Enviar email de recuperação
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Lembrou sua senha? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Voltar para login</Text>
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
    lineHeight: 24,
    marginBottom: 24,
  },
  form: {
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
  successContainer: {
    backgroundColor: '#0f1a0f',
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    color: GREEN,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  successSubtext: {
    color: '#66BB6A',
    fontSize: 13,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
  resetButtonText: {
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
});
