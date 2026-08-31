import { PropsWithChildren, ReactElement } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement;
}>;

export const Screen = ({
  children,
  scrollable = false,
  contentContainerStyle,
  refreshControl,
}: ScreenProps) => {
  const { colors } = useAppTheme();

  const containerStyles = [styles.container, { backgroundColor: colors.background }];
  const contentStyles = [styles.content, contentContainerStyle];

  if (scrollable) {
    return (
      <SafeAreaView style={containerStyles}>
        <ScrollView
          contentContainerStyle={contentStyles}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyles}>
      <View style={contentStyles}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
});


