/**
 * Dashboard Gestionnaire — app/(app)/index.tsx
 * KPIs en temps réel + alertes critiques + accès rapide
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDashboardKPIs, getAlerts } from '@hopegestion/api-client';
import { formatCurrency } from '@hopegestion/utils';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

// ─── Composants locaux ────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  suffix,
  color,
  emoji,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
  emoji: string;
}) {
  return (
    <View style={[styles.kpiCard, Shadows.md]}>
      <Text style={styles.kpiEmoji}>{emoji}</Text>
      <Text style={[styles.kpiValue, color ? { color } : {}]}>
        {value}{suffix}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  label,
  emoji,
  onPress,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.quickAction, Shadows.sm]} onPress={onPress}>
      <Text style={styles.quickActionEmoji}>{emoji}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();

  const {
    data: kpis,
    isLoading: kpisLoading,
    refetch: refetchKpis,
  } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: getDashboardKPIs,
  });

  const {
    data: alerts,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['alertes', 'unread'],
    queryFn: () => getAlerts(true),
  });

  const isRefreshing = kpisLoading || alertsLoading;
  const onRefresh = () => {
    refetchKpis();
    refetchAlerts();
  };

  const criticalAlerts = alerts?.filter((a) => a.severity === 'critical') || [];
  const unreadCount = alerts?.length || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Bonjour, {user?.nom || 'Gestionnaire'} 👋
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => router.push('/(app)/profil')}
        >
          <Text style={styles.avatarText}>
            {user?.nom?.charAt(0)?.toUpperCase() || 'G'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Alerte critique */}
        {criticalAlerts.length > 0 && (
          <TouchableOpacity
            style={styles.criticalBanner}
            onPress={() => router.push('/(app)/alertes')}
          >
            <Text style={styles.criticalEmoji}>🚨</Text>
            <Text style={styles.criticalText}>
              {criticalAlerts.length} alerte(s) critique(s) — Voir
            </Text>
            <Text style={styles.criticalArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* KPIs */}
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        {kpisLoading ? (
          <ActivityIndicator color={Colors.primary[500]} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.kpiGrid}>
            <KpiCard
              emoji="🏢"
              label="Biens"
              value={kpis?.total_biens ?? '—'}
            />
            <KpiCard
              emoji="👤"
              label="Locataires"
              value={kpis?.total_locataires ?? '—'}
            />
            <KpiCard
              emoji="📋"
              label="Locations"
              value={kpis?.total_locations_actives ?? '—'}
            />
            <KpiCard
              emoji="📈"
              label="Occupation"
              value={kpis?.taux_occupation ?? 0}
              suffix="%"
              color={Colors.primary[500]}
            />
            <KpiCard
              emoji="💰"
              label="Loyers du mois"
              value={kpis ? formatCurrency(kpis.loyers_encaisses_mois) : '—'}
            />
            <KpiCard
              emoji="⚠️"
              label="En retard"
              value={kpis?.loyers_en_retard ?? 0}
              color={kpis?.loyers_en_retard ? Colors.error : Colors.primary[500]}
            />
          </View>
        )}

        {/* Tickets ouverts */}
        {kpis && kpis.tickets_ouverts > 0 && (
          <TouchableOpacity
            style={styles.ticketBanner}
            onPress={() => router.push('/(app)/interventions')}
          >
            <Text style={styles.ticketEmoji}>🔧</Text>
            <Text style={styles.ticketText}>
              {kpis.tickets_ouverts} ticket(s) ouvert(s) à traiter
            </Text>
            <Text style={styles.ticketArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Accès rapides */}
        <Text style={styles.sectionTitle}>Accès rapides</Text>
        <View style={styles.quickGrid}>
          <QuickAction
            emoji="🏠"
            label="Biens"
            onPress={() => router.push('/(app)/biens')}
          />
          <QuickAction
            emoji="👤"
            label="Locataires"
            onPress={() => router.push('/(app)/locataires')}
          />
          <QuickAction
            emoji="💵"
            label="Finances"
            onPress={() => router.push('/(app)/finances')}
          />
          <QuickAction
            emoji="🔧"
            label="Tickets"
            onPress={() => router.push('/(app)/interventions')}
          />
          <QuickAction
            emoji="📄"
            label="EDL"
            onPress={() => router.push('/(app)/interventions')}
          />
          <QuickAction
            emoji="🔔"
            label={unreadCount > 0 ? `Alertes (${unreadCount})` : 'Alertes'}
            onPress={() => router.push('/(app)/alertes')}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[900],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.secondary[900],
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[800],
  },
  greeting: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
    marginBottom: 2,
  },
  date: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[400],
    textTransform: 'capitalize',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F1D1D',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  criticalEmoji: { fontSize: 20 },
  criticalText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  criticalArrow: {
    color: '#FCA5A5',
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.secondary[300],
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'flex-start',
    gap: 4,
  },
  kpiEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  kpiLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
  },
  ticketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    gap: Spacing.sm,
  },
  ticketEmoji: { fontSize: 20 },
  ticketText: {
    flex: 1,
    color: Colors.secondary[200],
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  ticketArrow: {
    color: Colors.secondary[400],
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickActionEmoji: {
    fontSize: 26,
  },
  quickActionLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[300],
    fontWeight: Typography.fontWeights.medium,
    textAlign: 'center',
  },
});
