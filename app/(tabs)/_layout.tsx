import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { colors } from '@/constants/theme';
import { useLang } from '@/lib/i18n';

export default function TabLayout() {
  const { t } = useLang();
  return (
    <Tabs
      screenOptions={{
        // accentText, not accent: the raw emerald fill is too light to read as
        // a label on white.
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome size={22} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: t('tab.ledger'),
          tabBarIcon: ({ color }) => <FontAwesome size={22} name="book" color={color} />,
        }}
      />
    </Tabs>
  );
}
