import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'होम',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome size={22} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: 'मेरा खाता',
          tabBarIcon: ({ color }) => <FontAwesome size={22} name="book" color={color} />,
        }}
      />
    </Tabs>
  );
}
