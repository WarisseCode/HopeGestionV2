/**
 * Interventions (Tickets) — app/(app)/interventions/index.tsx
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { interventionApi } from '@hopegestion/api-client';
import type { Ticket } from '@hopegestion/api-client';
import { timeAgo, getStatutLabel } from '@hopegestion/utils';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../../constants/theme';

const STATUT_COLORS: Record<string, string> = {
  ouvert: Colors.error,
  en_cours: Colors.warning,
  resolu: Colors.primary[500],
  ferme: Colors.secondary[500],
};

const PRIORITE_COLORS: Record<string, string> = {
  urgente: Colors.error,
  haute: '#F97316',
  normale: Colors.warning,
  basse: Colors.secondary[400],
};

const PRIORITE_EMOJI: Record<string, string> = {
  urgente: '🔴',
  haute: '🟠',
  normale: '🟡',
  basse: '🟢',
};

function TicketCard({ ticket }: { ticket: Ticket }) {
  const statutColor = STATUT_COLORS[ticket.statut] || Colors.secondary[400];
  const prioriteEmoji = PRIORITE_EMOJI[ticket.priorite] || '⚪';

  return (
    <TouchableOpacity
      style={[styles.card, Shadows.sm]}
      onPress={() => router.push(`/(app)/interventions/${ticket.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.prioriteEmoji}>{prioriteEmoji}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{ticket.title}</Text>
        <View style={[styles.statutBadge, { backgroundColor: `${statutColor}20` }]}>
          <Text style={[styles.statutText, { color: statutColor }]}>
            {getStatutLabel(ticket.statut)}
          </Text>
        </View>
      </View>

      {ticket.building_name && (
        <Text style={styles.location} numberOfLines={1}>
          🏢 {ticket.building_name}{ticket.ref_lot ? ` · ${ticket.ref_lot}` : ''}
        </Text>
      )}

      <View style={styles.cardFooter}>
        {ticket.assigned_name && (
          <Text style={styles.footerText}>👷 {ticket.assigned_name}</Text>
        )}
        <Text style={styles.footerTime}>{timeAgo(ticket.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'ouvert', label: 'Ouverts' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'resolu', label: 'Résolus' },
];

export default function InterventionsScreen() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tickets', filter],
    queryFn: () =>
      interventionApi.getTickets(filter !== 'all' ? { statut: filter } : {}),
  });

  const tickets = data?.data || [];
  const filtered = search
    ? tickets.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tickets;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Interventions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(app)/interventions/nouveau')}
        >
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un ticket..."
          placeholderTextColor={Colors.secondary[500]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary[500]} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <TicketCard ticket={item} />}
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
              <Text style={styles.emptyEmoji}>🔧</Text>
              <Text style={styles.emptyText}>Aucun ticket {filter !== 'all' ? `"${getStatutLabel(filter)}"` : ''}</Text>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  addButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textLight,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary[800],
    borderWidth: 1,
    borderColor: Colors.secondary[700],
  },
  filterChipActive: {
    backgroundColor: `${Colors.primary[500]}20`,
    borderColor: Colors.primary[500],
  },
  filterText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
    fontWeight: Typography.fontWeights.medium,
  },
  filterTextActive: {
    color: Colors.primary[400],
    fontWeight: Typography.fontWeights.semibold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: Typography.fontSizes.base,
    color: Colors.textLight,
    borderWidth: 1,
    borderColor: Colors.secondary[700],
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 32,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.secondary[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  prioriteEmoji: { fontSize: 16, marginTop: 2 },
  cardTitle: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textLight,
    lineHeight: 22,
  },
  statutBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statutText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  location: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[700],
  },
  footerText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
  },
  footerTime: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[500],
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
