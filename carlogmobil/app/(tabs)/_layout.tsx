import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppTutorial, useShouldShowTutorial } from '@/components/AppTutorial';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { getTutorialSteps } from '@/utils/tutorialSteps';

const TAB_ICON_SIZE = 22;

const tabScreenOptions = (title: string, icon: keyof typeof Feather.glyphMap) => ({
  title,
  tabBarIcon: ({ color }: { color: string }) => (
    <Feather name={icon} size={TAB_ICON_SIZE} color={color} />
  ),
});

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { shouldShow, isLoading } = useShouldShowTutorial();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isLoading || !shouldShow) return;
    const timer = setTimeout(() => setShowTutorial(true), 400);
    return () => clearTimeout(timer);
  }, [isLoading, shouldShow]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          lazy: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: Platform.OS === 'ios' ? 88 : 64,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen name="index" options={tabScreenOptions(t('tabs.records'), 'list')} />
        <Tabs.Screen name="stations" options={tabScreenOptions(t('tabs.stations'), 'map-pin')} />
        <Tabs.Screen name="reports" options={tabScreenOptions(t('tabs.reports'), 'bar-chart-2')} />
        <Tabs.Screen name="reminders" options={tabScreenOptions(t('tabs.reminders'), 'bell')} />
        <Tabs.Screen name="settings" options={tabScreenOptions(t('tabs.settings'), 'settings')} />
      </Tabs>

      {showTutorial ? (
        <AppTutorial
          steps={getTutorialSteps()}
          onComplete={() => setShowTutorial(false)}
        />
      ) : null}
    </View>
  );
}
