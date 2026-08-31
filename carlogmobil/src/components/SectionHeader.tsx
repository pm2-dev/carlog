import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

type SectionHeaderProps = PropsWithChildren<{ subtitle?: string }>; 

export const SectionHeader = ({ children, subtitle }: SectionHeaderProps) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{children}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
});


