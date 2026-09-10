/**
 * Écran de Login — (auth)/login.tsx
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { loginUser } from '@hopegestion/api-client';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import type { AuthUser } from '../../store/authStore';

export default function LoginScreen() {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir votre email et mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginUser(email.trim().toLowerCase(), password);

      // Vérifier que c'est un gestionnaire (MVP = gestionnaire uniquement)
      if (data.role !== 'gestionnaire' && data.role !== 'admin') {
        Alert.alert(
          'Accès non autorisé',
          'Cette application est réservée aux gestionnaires. Veuillez utiliser l\'application web pour accéder à votre espace.'
        );
        return;
      }

      const user: AuthUser = {
        id: data.userId,
        nom: '',
        email: email.trim().toLowerCase(),
        role: data.role as AuthUser['role'],
      };

      await setAuth(data.token, user);
      router.replace('/(app)');
    } catch (error) {
      Alert.alert(
        'Erreur de connexion',
        error instanceof Error ? error.message : 'Identifiants incorrects. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>HG</Text>
          </View>
          <Text style={styles.appName}>Hope Gestion</Text>
          <Text style={styles.tagline}>Espace Gestionnaire</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Connexion</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Hope Gestion — Gestion immobilière professionnelle
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[900],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.textLight,
  },
  appName: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[400],
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  form: {
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  formTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textLight,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.secondary[300],
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.secondary[900],
    borderWidth: 1,
    borderColor: Colors.secondary[700],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: Typography.fontSizes.base,
    color: Colors.textLight,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary[900],
    borderWidth: 1,
    borderColor: Colors.secondary[700],
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: Typography.fontSizes.base,
    color: Colors.textLight,
  },
  eyeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
  },
  forgotText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary[500],
    fontWeight: Typography.fontWeights.medium,
  },
  loginButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textLight,
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[500],
  },
});
