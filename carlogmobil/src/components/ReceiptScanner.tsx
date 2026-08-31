import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';

// ML Kit'i dinamik olarak import et (development build'de çalışır)
let TextRecognition: any = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch (e) {
  console.log('ML Kit text recognition not available (Expo Go mode)');
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ScannedReceiptData {
  totalCost?: string;
  liters?: string;
  unitPrice?: string;
  date?: string;
  stationName?: string;
}

interface ReceiptScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (data: ScannedReceiptData) => void;
}

// Türk yakıt fişlerinden veri çıkarma fonksiyonu
const extractReceiptData = (text: string): ScannedReceiptData => {
  const result: ScannedReceiptData = {};
  
  // Metni normalize et
  const fullText = text.replace(/\s+/g, ' ');
  const lines = text.split('\n').map(line => line.trim());
  
  console.log('OCR Text:', text); // Debug için
  
  // TOPLAM TUTAR - Türk fişlerinde "TOPLAM" satırından sonra gelen değer
  // Örnek: "TOPLAM *650,29" veya "TOPLAM *1.000,00"
  const totalPatterns = [
    /TOPLAM\s*\*?\s*([0-9.,]+)/i,
    /TOPLAM\s+([0-9.,]+)/i,
    /K\.KARTI\/B\.KARTI\s*\*?\s*([0-9.,]+)/i,
    /NAK[IİĐ]T\s*\*?\s*([0-9.,]+)/i,
    /GENEL\s*TOPLAM\s*\*?\s*([0-9.,]+)/i,
  ];
  
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Türk formatını düzelt: 1.000,00 -> 1000.00
      let value = match[1];
      // Önce binlik ayracı (nokta) kaldır, sonra virgülü noktaya çevir
      value = value.replace(/\./g, '').replace(',', '.');
      result.totalCost = value;
      break;
    }
  }
  
  // LİTRE - Türk fişlerinde "XX,XXX LT" formatında
  // Örnek: "15,520 LT X 41,90" veya "23,770 LT X 42,07"
  const literPatterns = [
    /([0-9]+[,.]?[0-9]*)\s*LT\s*X/i,
    /([0-9]+[,.]?[0-9]*)\s*L[İI]TRE/i,
    /([0-9]+[,.]?[0-9]*)\s*LT\b/i,
  ];
  
  for (const pattern of literPatterns) {
    const match = text.match(pattern);
    if (match) {
      let value = match[1].replace(',', '.');
      result.liters = value;
      break;
    }
  }
  
  // BİRİM FİYAT - "LT X XX,XX" formatında
  // Örnek: "15,520 LT X 41,90"
  const unitPricePatterns = [
    /LT\s*X\s*([0-9]+[,.]?[0-9]*)/i,
    /L[İI]TRE\s*X\s*([0-9]+[,.]?[0-9]*)/i,
    /X\s*([0-9]+[,.]?[0-9]*)\s*(?:TL)?/i,
  ];
  
  for (const pattern of unitPricePatterns) {
    const match = text.match(pattern);
    if (match) {
      let value = match[1].replace(',', '.');
      result.unitPrice = value;
      break;
    }
  }
  
  // TARİH - Türk formatı: "11-02-2024" veya "10-05-2024"
  const datePatterns = [
    /(\d{2})[-.](\d{2})[-.](\d{4})/,
    /(\d{2})[-.](\d{2})[-.](\d{2})\b/,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const day = match[1];
      const month = match[2];
      let year = match[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      result.date = `${day}.${month}.${year}`;
      break;
    }
  }
  
  // İSTASYON ADI - Fişin üst kısmındaki şirket adından
  const stationKeywords = [
    { keyword: 'SHELL', name: 'Shell' },
    { keyword: 'BP', name: 'BP' },
    { keyword: 'OPET', name: 'Opet' },
    { keyword: 'PETROL OF', name: 'Petrol Ofisi' },
    { keyword: 'TOTAL', name: 'Total' },
    { keyword: 'LUKOIL', name: 'Lukoil' },
    { keyword: 'AYTEMIZ', name: 'Aytemiz' },
    { keyword: 'ALPET', name: 'Alpet' },
    { keyword: 'MOIL', name: 'Moil' },
    { keyword: 'KADOIL', name: 'Kadoil' },
    { keyword: 'SUNPET', name: 'Sunpet' },
    { keyword: 'TURKUAZ', name: 'Turkuaz' },
    { keyword: 'PETROL', name: 'Petrol' },
    { keyword: 'MEHMETÇ', name: 'Mehmetçik Petrol' },
    { keyword: 'DOGAN', name: 'Doğan Petrol' },
  ];
  
  const upperText = text.toUpperCase();
  for (const station of stationKeywords) {
    if (upperText.includes(station.keyword)) {
      result.stationName = station.name;
      break;
    }
  }
  
  // Yakıt türü tespiti (opsiyonel bilgi için)
  const fuelTypes = ['MOTORIN', 'EURODI', 'BENZIN', 'KURŞUNSUZ', 'LPG', 'EXCELLIUM'];
  for (const fuel of fuelTypes) {
    if (upperText.includes(fuel)) {
      // İstasyon adına yakıt türünü ekleyebiliriz
      if (result.stationName) {
        result.stationName += ` (${fuel.charAt(0) + fuel.slice(1).toLowerCase()})`;
      }
      break;
    }
  }
  
  return result;
};

// ML Kit ile OCR yapma (development build'de çalışır)
const performOCR = async (imageUri: string): Promise<string> => {
  // ML Kit mevcut değilse (Expo Go modunda) boş döndür
  if (!TextRecognition) {
    console.log('ML Kit not available, falling back to manual mode');
    return '';
  }
  
  try {
    const result = await TextRecognition.recognize(imageUri);
    console.log('ML Kit Result:', result);
    return result.text || '';
  } catch (error) {
    console.error('OCR Error:', error);
    return '';
  }
};

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  visible,
  onClose,
  onScanComplete,
}) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false); // OCR başarılı mı?
  const cameraRef = useRef<CameraView>(null);

  const resetState = useCallback(() => {
    setCapturedImage(null);
    setScannedData(null);
    setIsProcessing(false);
    setManualMode(false);
    setOcrSuccess(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1, // En yüksek kalite OCR için
          base64: false,
          skipProcessing: false,
        });
        if (photo) {
          setCapturedImage(photo.uri);
          processImage(photo.uri);
        }
      } catch (error) {
        console.error('Fotoğraf çekilemedi:', error);
        Alert.alert(t('common.error'), t('receipt_scanner.capture_error'));
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Düzenleme kapalı - orijinal görüntü OCR için daha iyi
      quality: 1, // En yüksek kalite
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    setOcrSuccess(false);
    
    // ML Kit mevcut değilse direkt manuel moda geç
    if (!TextRecognition) {
      console.log('ML Kit mevcut değil, manuel moda geçiliyor');
      setTimeout(() => {
        setIsProcessing(false);
        setOcrSuccess(false);
        setScannedData({});
        setManualMode(true);
      }, 500);
      return;
    }
    
    try {
      // ML Kit ile OCR yap
      const ocrText = await performOCR(uri);
      
      if (ocrText && ocrText.length > 0) {
        console.log('OCR başarılı, metin uzunluğu:', ocrText.length);
        // Metinden veri çıkar
        const extractedData = extractReceiptData(ocrText);
        console.log('Çıkarılan veri:', extractedData);
        
        // En az bir değer çıkarıldı mı kontrol et
        const hasData = extractedData.totalCost || extractedData.liters || 
                       extractedData.unitPrice || extractedData.date;
        
        setOcrSuccess(!!hasData);
        setScannedData(extractedData);
        setManualMode(true);
        setIsProcessing(false);
      } else {
        // OCR başarısız oldu, manuel giriş moduna geç
        console.log('OCR metin bulunamadı, manuel moda geçiliyor');
        setOcrSuccess(false);
        setScannedData({});
        setManualMode(true);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('OCR hatası:', error);
      setIsProcessing(false);
      setOcrSuccess(false);
      // Hata durumunda manuel giriş moduna geç
      setScannedData({});
      setManualMode(true);
    }
  };

  const handleConfirm = () => {
    if (scannedData) {
      onScanComplete(scannedData);
      handleClose();
    }
  };

  const updateScannedData = (field: keyof ScannedReceiptData, value: string) => {
    setScannedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Kamera izni yoksa
  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
              {t('receipt_scanner.camera_permission_required')}
            </Text>
            <Pressable
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>
                {t('receipt_scanner.grant_permission')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('receipt_scanner.title')}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {!capturedImage ? (
          // Kamera görünümü
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
            >
              {/* Çerçeve overlay */}
              <View style={styles.overlay}>
                <View style={[styles.overlayTop, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                <View style={styles.overlayMiddle}>
                  <View style={[styles.overlaySide, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
                    <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
                    <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
                    <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
                  </View>
                  <View style={[styles.overlaySide, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                </View>
                <View style={[styles.overlayBottom, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
              </View>

              {/* Yardımcı metin */}
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpText}>
                  {t('receipt_scanner.align_receipt')}
                </Text>
              </View>
            </CameraView>

            {/* Alt kontroller */}
            <View style={[styles.controls, { backgroundColor: colors.surface }]}>
              <Pressable
                style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}
                onPress={pickImage}
              >
                <Ionicons name="images-outline" size={24} color={colors.textPrimary} />
                <Text style={[styles.controlButtonText, { color: colors.textSecondary }]}>
                  {t('receipt_scanner.gallery')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.captureButton, { backgroundColor: colors.primary }]}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </Pressable>

              <Pressable
                style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => {
                  setManualMode(true);
                  setScannedData({});
                }}
              >
                <Ionicons name="create-outline" size={24} color={colors.textPrimary} />
                <Text style={[styles.controlButtonText, { color: colors.textSecondary }]}>
                  {t('receipt_scanner.manual')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : isProcessing ? (
          // İşleniyor
          <View style={styles.processingContainer}>
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            <View style={[styles.processingOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>
                {t('receipt_scanner.processing')}
              </Text>
            </View>
          </View>
        ) : manualMode || scannedData ? (
          // Sonuç/Manuel giriş görünümü
          <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.thumbnailImage} />
            )}
            
            {/* OCR sonucuna göre farklı bilgi kartı */}
            <View style={[
              styles.infoCard, 
              { backgroundColor: ocrSuccess ? '#E8F5E9' : colors.surfaceAlt }
            ]}>
              <Ionicons 
                name={ocrSuccess ? "checkmark-circle" : "information-circle"} 
                size={20} 
                color={ocrSuccess ? '#4CAF50' : colors.primary} 
              />
              <Text style={[
                styles.infoText, 
                { color: ocrSuccess ? '#2E7D32' : colors.textSecondary }
              ]}>
                {ocrSuccess 
                  ? t('receipt_scanner.ocr_success') 
                  : t('receipt_scanner.manual_entry_info')}
              </Text>
            </View>

            <View style={styles.fieldsContainer}>
              <DataField
                label={t('receipt_scanner.total_cost')}
                value={scannedData?.totalCost || ''}
                onChangeText={(v) => updateScannedData('totalCost', v)}
                placeholder="0.00"
                keyboardType="numeric"
                suffix="₺"
                colors={colors}
              />
              <DataField
                label={t('receipt_scanner.liters')}
                value={scannedData?.liters || ''}
                onChangeText={(v) => updateScannedData('liters', v)}
                placeholder="0.00"
                keyboardType="numeric"
                suffix="L"
                colors={colors}
              />
              <DataField
                label={t('receipt_scanner.unit_price')}
                value={scannedData?.unitPrice || ''}
                onChangeText={(v) => updateScannedData('unitPrice', v)}
                placeholder="0.00"
                keyboardType="numeric"
                suffix="₺/L"
                colors={colors}
              />
              <DataField
                label={t('receipt_scanner.date')}
                value={scannedData?.date || ''}
                onChangeText={(v) => updateScannedData('date', v)}
                placeholder="GG.AA.YYYY"
                colors={colors}
              />
              <DataField
                label={t('receipt_scanner.station_name')}
                value={scannedData?.stationName || ''}
                onChangeText={(v) => updateScannedData('stationName', v)}
                placeholder={t('receipt_scanner.station_placeholder')}
                colors={colors}
              />
            </View>

            <View style={styles.resultButtons}>
              <Pressable
                style={[styles.resultButton, { borderColor: colors.border }]}
                onPress={resetState}
              >
                <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                <Text style={[styles.resultButtonText, { color: colors.textSecondary }]}>
                  {t('receipt_scanner.retake')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.resultButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={[styles.resultButtonText, { color: '#FFF' }]}>
                  {t('receipt_scanner.use_data')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
};

interface DataFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  suffix?: string;
  colors: any;
}

const DataField: React.FC<DataFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  suffix,
  colors,
}) => {
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[
        styles.fieldInputContainer,
        { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }
      ]}>
        <TextInput
          style={[styles.textInput, { color: colors.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType === 'numeric' ? 'decimal-pad' : 'default'}
        />
        {suffix && (
          <Text style={[styles.fieldSuffix, { color: colors.textMuted }]}>{suffix}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCREEN_HEIGHT * 0.4,
  },
  overlaySide: {
    width: 40,
  },
  overlayBottom: {
    flex: 1,
  },
  scanFrame: {
    flex: 1,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  helpTextContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  helpText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  controlButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 14,
  },
  processingContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  processingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
  },
  resultContent: {
    padding: 20,
    gap: 16,
  },
  thumbnailImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldsContainer: {
    gap: 12,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 12,
  },
  fieldValue: {
    fontSize: 16,
  },
  fieldSuffix: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  confirmButton: {
    borderWidth: 0,
  },
  resultButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ReceiptScanner;

