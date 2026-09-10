/**
 * Finances — app/(app)/finances/index.tsx
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '@hopegestion/api-client';
import { formatCurrency, formatDateShort } from '@hopegestion/utils';
import type { Payment } from '@hopegestion/shared-types';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../../constants/theme';

function StatCard({ label, value, emoji, color }: {
  label: string; value: string; emoji: string; color?: string;
}) {
  return (
    <View style={[styles.statCard, Shadows.sm]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const isPositive = payment.type !== 'depense';
  return (
    <View style={styles.paymentRow}>
      <View style={[styles.paymentIcon, { backgroundColor: isPositive ? `${Colors.primary[500]}20` : `${Colors.error}20` }]}>
        <Text style={styles.paymentIconText}>{isPositive ? '💰' : '💸'}</Text>
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentName} numberOfLines={1}>
          {payment.locataire_nom} {payment.locataire_prenoms}
        </Text>
        <Text style={styles.paymentRef}>{payment.reference_bail}</Text>
        <Text style={styles.paymentDate}>{formatDateShort(payment.payment_date)}</Text>
      </View>
      <Text style={[styles.paymentAmount, { color: isPositive ? Colors.primary[500] : Colors.error }]}>
        {isPositive ? '+' : '-'}{formatCurrency(payment.amount)}
      </Text>
    </View>
  );
}

export default function FinancesScreen() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['finances', 'stats'],
    queryFn: () => financeApi.getStats(),
  });

  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['finances', 'payments'],
    queryFn: () => financeApi.getPayments(),
  });

  const isLoading = statsLoading || paymentsLoading;
  const onRefresh = () => { refetchStats(); refetchPayments(); };

  const recent = payments.slice(0, 20);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Finances</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={Colors.primary[500]} colors={[Colors.primary[500]]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats du mois */}
        <Text style={styles.sectionTitle}>Ce mois-ci</Text>
        {statsLoading ? (
          <ActivityIndicator color={Colors.primary[500]} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              emoji="💰"
              label="Encaissé"
              value={formatCurrency(stats?.encashed_month || 0)}
              color={Colors.primary[500]}
            />
            <StatCard
              emoji="💸"
              label="Dépenses"
              value={formatCurrency(stats?.expenses_month || 0)}
              color={Colors.error}
            />
            <StatCard
              emoji="📊"
              label="Solde net"
              value={formatCurrency(stats?.net_balance || 0)}
              color={(stats?.net_balance || 0) >= 0 ? Colors.primary[500] : Colors.error}
            />
            <StatCard
              emoji="⏳"
              label="En attente"
              value={formatCurrency(stats?.pending_total || 0)}
              color={Colors.warning}
            />
          </View>
        )}

        {/* Historique */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Historique récent</Text>
        </View>

        {paymentsLoading ? (
          <ActivityIndicator color={Colors.primary[500]} style={{ marginVertical: 24 }} />
        ) : recent.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </View>
        ) : (
          <View style={styles.paymentsList}>
            {recent.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary[900] },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  content: { paddingHorizontal: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.secondary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: 4,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentsList: {
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[700],
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconText: { fontSize: 20 },
  paymentInfo: { flex: 1 },
  paymentName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textLight,
  },
  paymentRef: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
    marginTop: 1,
  },
  paymentDate: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[500],
    marginTop: 1,
  },
  paymentAmount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.secondary[400],
  },
});
