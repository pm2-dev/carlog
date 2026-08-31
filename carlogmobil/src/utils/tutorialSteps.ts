import { Dimensions } from 'react-native';
import type { TutorialStep } from '@/components/AppTutorial';
import i18n from '@/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom tab bar height yaklaşık 65-70px
const TAB_BAR_HEIGHT = 70;
const TAB_ITEM_WIDTH = SCREEN_WIDTH / 5; // 5 tab var

export const getTutorialSteps = (): TutorialStep[] => {
  return [
    // Hoş geldiniz
    {
      id: 'welcome',
      title: i18n.t('tutorial.welcome_title'),
      description: i18n.t('tutorial.welcome_description'),
      position: {
        top: SCREEN_HEIGHT / 2 - 150,
        left: 0,
        right: 0,
      },
    },

    // Kayıtlar (Index - Tab 0)
    {
      id: 'records',
      title: i18n.t('tutorial.records_title'),
      description: i18n.t('tutorial.records_description'),
      position: {
        top: 120,
        left: 0,
        right: 0,
      },
      highlightArea: {
        top: SCREEN_HEIGHT - TAB_BAR_HEIGHT - 10,
        left: 0,
        width: TAB_ITEM_WIDTH,
        height: TAB_BAR_HEIGHT,
      },
    },

    // İstasyonlar (Tab 1)
    {
      id: 'stations',
      title: i18n.t('tutorial.stations_title'),
      description: i18n.t('tutorial.stations_description'),
      position: {
        top: 120,
        left: 0,
        right: 0,
      },
      highlightArea: {
        top: SCREEN_HEIGHT - TAB_BAR_HEIGHT - 10,
        left: TAB_ITEM_WIDTH,
        width: TAB_ITEM_WIDTH,
        height: TAB_BAR_HEIGHT,
      },
    },

    // Raporlar (Tab 2)
    {
      id: 'reports',
      title: i18n.t('tutorial.reports_title'),
      description: i18n.t('tutorial.reports_description'),
      position: {
        top: 120,
        left: 0,
        right: 0,
      },
      highlightArea: {
        top: SCREEN_HEIGHT - TAB_BAR_HEIGHT - 10,
        left: TAB_ITEM_WIDTH * 2,
        width: TAB_ITEM_WIDTH,
        height: TAB_BAR_HEIGHT,
      },
    },

    // Hatırlatmalar (Tab 3)
    {
      id: 'reminders',
      title: i18n.t('tutorial.reminders_title'),
      description: i18n.t('tutorial.reminders_description'),
      position: {
        top: 120,
        left: 0,
        right: 0,
      },
      highlightArea: {
        top: SCREEN_HEIGHT - TAB_BAR_HEIGHT - 10,
        left: TAB_ITEM_WIDTH * 3,
        width: TAB_ITEM_WIDTH,
        height: TAB_BAR_HEIGHT,
      },
    },

    // Ayarlar (Tab 4)
    {
      id: 'settings',
      title: i18n.t('tutorial.settings_title'),
      description: i18n.t('tutorial.settings_description'),
      position: {
        top: 120,
        left: 0,
        right: 0,
      },
      highlightArea: {
        top: SCREEN_HEIGHT - TAB_BAR_HEIGHT - 10,
        left: TAB_ITEM_WIDTH * 4,
        width: TAB_ITEM_WIDTH,
        height: TAB_BAR_HEIGHT,
      },
    },

    // Son adım - başlayalım
    {
      id: 'start',
      title: i18n.t('tutorial.ready_title'),
      description: i18n.t('tutorial.ready_description'),
      position: {
        top: SCREEN_HEIGHT / 2 - 150,
        left: 0,
        right: 0,
      },
    },
  ];
};

