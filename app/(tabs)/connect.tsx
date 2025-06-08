import BleDeviceManager from '@/components/BleManager';
import { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ConnectScreen() {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

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
    <ThemedView style={styles.container}>
      {/* Header with Title and Refresh Icon */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Búsqueda de dispositivos</ThemedText>
        <TouchableOpacity onPress={() => handleRefresh(() => {})}>
         {/*<MaterialIcons name="refresh" size={24} color="#888" />*/} 
        </TouchableOpacity>
      </ThemedView>

      {/* BLE Device Manager */}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  section: {
    padding: 20,
  },
});