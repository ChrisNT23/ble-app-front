import BleDeviceManager from '@/components/BleDeviceManager';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ConnectScreen() {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Colores adaptativos para modo claro/oscuro
  const colors = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    border: isDark ? '#38383A' : '#E0E0E0',
  };

  // Verifica si los datos ya existen, no los sobrescribe
  const checkEmergencyData = async () => {
    const emergencyContact = await AsyncStorage.getItem('emergencyContact');
    if (!emergencyContact) {
      Alert.alert('Configuración Pendiente', 'Por favor, configura un número de WhatsApp de emergencia en la pantalla de ajustes.');
    }
  };

  useEffect(() => {
    checkEmergencyData();
  }, []);

  const handleDeviceConnected = (device: Device) => {
    Alert.alert('Connected', `Connected to ${device.name || 'Unnamed Device'}`);
    setConnectedDevice(device);
  };

  const handleScanError = (error: Error) => {
    Alert.alert('Scan Error', error.message || 'Failed to scan for devices');
  };

  const handleRefresh = (startScan: () => void) => {
    if (!connectedDevice) {
      startScan();
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText type="title">Búsqueda de dispositivos</ThemedText>       
      </ThemedView>
      <ThemedView style={styles.section}>
        <BleDeviceManager
          connectedDevice={connectedDevice}
          setConnectedDevice={setConnectedDevice}
          onDeviceConnected={handleDeviceConnected}
          onScanError={handleScanError}
          onRefresh={handleRefresh}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 25,
    borderBottomWidth: 1,
  },
  section: {
    padding: 20,
  },
  refreshButton: {
    padding: 5,
  },
});