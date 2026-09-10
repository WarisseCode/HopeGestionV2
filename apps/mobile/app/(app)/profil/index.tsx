/**
 * Profil — app/(app)/profil/index.tsx
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { getInitials } from '@hopegestion/utils';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../../constants/theme';

function MenuRow({
  emoji,
  label,
  onPress,
  danger = false,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuRow, Shadows.sm]} onPress={onPress}>
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={[styles.menuLabel, danger && { color: Colors.error }]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfilScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar & Nom */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(user?.nom || 'G', user?.prenoms)}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.prenoms} {user?.nom}
        </Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Gestionnaire</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Mon compte</Text>
        <MenuRow emoji="✏️" label="Modifier mon profil" onPress={() => {}} />
        <MenuRow emoji="🔒" label="Changer mon mot de passe" onPress={() => {}} />
        <MenuRow emoji="🔔" label="Préférences notifications" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Application</Text>
        <MenuRow emoji="📱" label="Version 1.0.0 (MVP)" onPress={() => {}} />
        <MenuRow emoji="📋" label="Conditions d'utilisation" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <MenuRow emoji="🚪" label="Se déconnecter" onPress={handleLogout} danger />
      </View>

      <Text style={styles.footer}>Hope Gestion · SKILLEXIE S.E.P</Text>
      <Text style={styles.footerSub}>contact@hopegestion.com</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary[900] },
  content: { paddingBottom: 48 },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[800],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: `${Colors.primary[500]}50`,
  },
  avatarText: {
    fontSize: Typography.fontSizes.xxxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  profileName: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[400],
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    backgroundColor: `${Colors.primary[500]}20`,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: `${Colors.primary[500]}40`,
  },
  roleText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.secondary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuEmoji: { fontSize: 20 },
  menuLabel: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textLight,
    fontWeight: Typography.fontWeights.medium,
  },
  menuArrow: {
    fontSize: Typography.fontSizes.xl,
    color: Colors.secondary[500],
    fontWeight: Typography.fontWeights.bold,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.xxl,
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[600],
  },
  footerSub: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[600],
  },
});
