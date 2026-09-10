/**
 * Mot de passe oublié — (auth)/forgot-password.tsx
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { forgotPassword } from '@hopegestion/api-client';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Veuillez saisir votre adresse email.');
      return;
    }
    setIsLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>📧</Text>
          <Text style={styles.successTitle}>Email envoyé !</Text>
          <Text style={styles.successText}>
            Si un compte existe avec {email}, vous recevrez un lien de réinitialisation.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Entrez votre adresse email. Nous vous enverrons un lien de réinitialisation.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse email</Text>
          <TextInput
            style={styles.input}
            placeholder="votre@email.com"
            placeholderTextColor={Colors.secondary[500]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.disabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitText}>Envoyer le lien</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary[900] },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
  },
  backLink: { marginBottom: Spacing.xl },
  backLinkText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[400],
    fontWeight: Typography.fontWeights.medium,
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[400],
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  inputGroup: { marginBottom: Spacing.xl },
  label: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[300],
    fontWeight: Typography.fontWeights.medium,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.secondary[800],
    borderWidth: 1,
    borderColor: Colors.secondary[700],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: Typography.fontSizes.base,
    color: Colors.textLight,
  },
  submitButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  submitText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textLight,
  },
  successCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  successEmoji: { fontSize: 64 },
  successTitle: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  successText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.secondary[400],
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[200],
    fontWeight: Typography.fontWeights.medium,
  },
});
