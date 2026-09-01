import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';

const TUTORIAL_STORAGE_KEY = '@carlog_tutorial_completed';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type TutorialStep = {
  id: string;
  title: string;
  description: string;
  position: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  highlightArea?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

type AppTutorialProps = {
  steps: TutorialStep[];
  onComplete: () => void;
  visible: boolean;
};

export const AppTutorial = ({ steps, onComplete, visible }: AppTutorialProps) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    onComplete();
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    onComplete();
  };

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <View style={styles.overlay} pointerEvents="box-none">
        {/* Görsel karartma — dokunuşları engellemez, tab bar tıklanabilir kalır */}
        <View
          pointerEvents="none"
          style={[styles.darkOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.88)' }]}>
          {step.highlightArea && (
            <View
              style={[
                styles.highlightHole,
                {
                  top: step.highlightArea.top,
                  left: step.highlightArea.left,
                  width: step.highlightArea.width,
                  height: step.highlightArea.height,
                  borderColor: colors.primary,
                  borderWidth: 3,
                  borderRadius: 12,
                  backgroundColor: 'transparent',
                },
              ]}
            />
          )}
        </View>

        {/* Tooltip — sadece bu alan dokunuş alır */}
        <View
          pointerEvents="auto"
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.surface,
              ...step.position,
            },
          ]}>
          <View style={styles.tooltipHeader}>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.stepIndicator, { color: colors.primary }]}>
              {t('tutorial.step_indicator', { current: currentStep + 1, total: steps.length })}
            </Text>
          </View>

          <Text style={[styles.tooltipTitle, { color: colors.textPrimary }]}>{step.title}</Text>
          <Text style={[styles.tooltipDescription, { color: colors.textSecondary }]}>
            {step.description}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleSkip}
              style={[styles.button, styles.skipButton, { borderColor: colors.border }]}>
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                {t('tutorial.skip')}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleNext}
              style={[styles.button, styles.nextButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.nextButtonText, { color: '#FFFFFF' }]}>
                {currentStep === steps.length - 1 ? t('tutorial.start') : t('tutorial.next')}
              </Text>
            </Pressable>
          </View>
        </View>
    </View>
  );
};

// Hook to check if tutorial should be shown
export const useShouldShowTutorial = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
      setShouldShow(completed !== 'true');
    } catch (error) {
      console.error('Error checking tutorial status:', error);
      setShouldShow(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTutorial = async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
      setShouldShow(true);
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  };

  return { shouldShow, isLoading, resetTutorial };
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  highlightHole: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  tooltip: {
    position: 'absolute',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipHeader: {
    marginBottom: 12,
    gap: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

