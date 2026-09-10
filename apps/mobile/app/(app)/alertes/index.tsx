/**
 * Centre d'alertes — app/(app)/alertes/index.tsx
 */
import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, markAlertRead, markAllAlertsRead } from '@hopegestion/api-client';
import type { AlertItem } from '@hopegestion/api-client';
import { timeAgo } from '@hopegestion/utils';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../../constants/theme';

const SEVERITY_CONFIG = {
  critical: { color: Colors.error, emoji: '🚨', bg: '#7F1D1D' },
  warning: { color: Colors.warning, emoji: '⚠️', bg: '#78350F' },
  info: { color: Colors.info, emoji: 'ℹ️', bg: '#1E3A5F' },
};

function AlertCard({
  alert,
  onRead,
}: {
  alert: AlertItem;
  onRead: (id: number) => void;
}) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        Shadows.sm,
        !alert.read && styles.cardUnread,
        !alert.read && { borderLeftColor: config.color },
      ]}
      onPress={() => !alert.read && onRead(alert.id)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <Text style={styles.iconEmoji}>{config.emoji}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardMessage}>{alert.message}</Text>
          <Text style={styles.cardTime}>{timeAgo(alert.created_at)}</Text>
        </View>
        {!alert.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
}

export default function AlertesScreen() {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['alertes'],
    queryFn: () => getAlerts(),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertes'] }),
  });

  const { mutate: markAllRead, isPending: isMarkingAll } = useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertes'] }),
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alertes</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadLabel}>
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={() => markAllRead()}
            disabled={isMarkingAll}
          >
            <Text style={styles.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary[500]} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AlertCard alert={item} onRead={(id) => markRead(id)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={Colors.primary[500]}
              colors={[Colors.primary[500]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyText}>Aucune alerte pour le moment</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary[900] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[800],
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  unreadLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.error,
    fontWeight: Typography.fontWeights.medium,
    marginTop: 2,
  },
  markAllBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.secondary[600],
    marginTop: 4,
  },
  markAllText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[300],
    fontWeight: Typography.fontWeights.medium,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 32,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  cardUnread: {
    borderLeftWidth: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 18 },
  cardContent: { flex: 1 },
  cardMessage: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textLight,
    lineHeight: 20,
    fontWeight: Typography.fontWeights.medium,
  },
  cardTime: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.secondary[400],
  },
});
