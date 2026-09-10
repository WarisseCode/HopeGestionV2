/**
 * Liste des Locataires — app/(app)/locataires/index.tsx
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getLocataires } from '@hopegestion/api-client';
import type { Locataire } from '@hopegestion/shared-types';
import { getInitials, getWhatsAppLink, getTelLink } from '@hopegestion/utils';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../../constants/theme';

function LocataireCard({ locataire }: { locataire: Locataire }) {
  const statutColor =
    locataire.statut === 'Actif' ? Colors.primary[500] :
    locataire.statut === 'En attente' ? Colors.warning : Colors.secondary[500];

  const handleCall = () => {
    Linking.openURL(getTelLink(locataire.telephone_principal));
  };

  const handleWhatsApp = () => {
    Linking.openURL(
      getWhatsAppLink(locataire.telephone_principal, `Bonjour ${locataire.prenoms},`)
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, Shadows.sm]}
      onPress={() => router.push(`/(app)/locataires/${locataire.id}`)}
    >
      <View style={styles.cardMain}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(locataire.nom, locataire.prenoms)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {locataire.prenoms} {locataire.nom}
          </Text>
          {locataire.lot_nom && (
            <Text style={styles.cardLot} numberOfLines={1}>
              {locataire.lot_nom}
            </Text>
          )}
          <View style={[styles.statutBadge, { backgroundColor: `${statutColor}20` }]}>
            <Text style={[styles.statutText, { color: statutColor }]}>
              {locataire.statut}
            </Text>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
            <Text style={styles.actionBtnEmoji}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleWhatsApp}>
            <Text style={styles.actionBtnEmoji}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      {locataire.loyer_actuel !== undefined && (
        <View style={styles.cardFooter}>
          <Text style={styles.footerLabel}>Loyer mensuel</Text>
          <Text style={styles.footerValue}>
            {locataire.loyer_actuel?.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function LocatairesScreen() {
  const [search, setSearch] = useState('');

  const { data: locataires = [], isLoading, refetch } = useQuery({
    queryKey: ['locataires'],
    queryFn: () => getLocataires(),
  });

  const filtered = locataires.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.nom.toLowerCase().includes(q) ||
      l.prenoms.toLowerCase().includes(q) ||
      l.telephone_principal.includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Locataires</Text>
        <Text style={styles.count}>
          {locataires.length} locataire{locataires.length > 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Nom, prénom, téléphone..."
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
          renderItem={({ item }) => <LocataireCard locataire={item} />}
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
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyText}>Aucun locataire trouvé</Text>
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
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500] + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary[500] + '50',
  },
  avatarText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary[400],
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textLight,
  },
  cardLot: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
    marginTop: 2,
  },
  statutBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  statutText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnEmoji: { fontSize: 16 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[700],
  },
  footerLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[400],
  },
  footerValue: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary[400],
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
