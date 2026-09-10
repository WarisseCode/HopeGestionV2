/**
 * App Layout — Bottom Tab Navigator
 * 5 onglets principaux pour le gestionnaire
 */
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

interface TabIconProps {
  focused: boolean;
  emoji: string;
  label: string;
}

function TabIcon({ focused, emoji, label }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🏠" label="Accueil" />
          ),
        }}
      />
      <Tabs.Screen
        name="biens"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🏢" label="Biens" />
          ),
        }}
      />
      <Tabs.Screen
        name="locataires"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="👤" label="Locataires" />
          ),
        }}
      />
      <Tabs.Screen
        name="interventions"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🔧" label="Tickets" />
          ),
        }}
      />
      <Tabs.Screen
        name="alertes"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🔔" label="Alertes" />
          ),
        }}
      />
      {/* Écrans non affichés dans les tabs */}
      <Tabs.Screen name="finances" options={{ href: null }} />
      <Tabs.Screen name="profil" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.secondary[900],
    borderTopColor: Colors.secondary[800],
    borderTopWidth: 1,
    paddingTop: 8,
    height: 72,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  emojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.secondary[500],
    fontWeight: Typography.fontWeights.medium,
  },
  tabLabelFocused: {
    color: Colors.primary[500],
    fontWeight: Typography.fontWeights.semibold,
  },
});
