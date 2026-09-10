/**
 * Liste des Biens — app/(app)/biens/index.tsx
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getImmeubles } from '@hopegestion/api-client';
import type { Immeuble } from '@hopegestion/shared-types';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../../constants/theme';

function BienCard({ bien }: { bien: Immeuble }) {
  const occupationColor =
    bien.occupation >= 80
      ? Colors.primary[500]
      : bien.occupation >= 50
      ? Colors.warning
      : Colors.error;

  return (
    <TouchableOpacity
      style={[styles.card, Shadows.sm]}
      onPress={() => router.push(`/(app)/biens/${bien.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>🏢</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{bien.nom}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {bien.adresse} · {bien.ville}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${occupationColor}20` }]}>
          <Text style={[styles.statusText, { color: occupationColor }]}>
            {bien.occupation}%
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.footerStat}>
          <Text style={styles.footerStatValue}>{bien.nbLots}</Text> lots
        </Text>
        <Text style={styles.footerStat}>
          Type : <Text style={styles.footerStatValue}>{bien.type}</Text>
        </Text>
        <Text style={styles.footerStat}>
          <Text style={styles.footerStatValue}>{bien.occupation}%</Text> occupé
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BiensScreen() {
  const [search, setSearch] = useState('');

  const { data: biens = [], isLoading, refetch } = useQuery({
    queryKey: ['biens'],
    queryFn: getImmeubles,
  });

  const filtered = biens.filter(
    (b) =>
      b.nom.toLowerCase().includes(search.toLowerCase()) ||
      b.ville?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Biens immobiliers</Text>
        <Text style={styles.count}>{biens.length} bien{biens.length > 1 ? 's' : ''}</Text>
      </View>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un bien..."
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
          renderItem={({ item }) => <BienCard bien={item} />}
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
              <Text style={styles.emptyEmoji}>🏢</Text>
              <Text style={styles.emptyText}>Aucun bien trouvé</Text>
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
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textLight,
  },
  count: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.secondary[400],
    backgroundColor: Colors.secondary[800],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary[500]}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textLight,
  },
  cardSubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[700],
  },
  footerStat: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
  },
  footerStatValue: {
    color: Colors.secondary[200],
    fontWeight: Typography.fontWeights.medium,
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
