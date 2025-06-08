import { Image, TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Header with Connection Status */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Aqui va el nombre de la app</ThemedText>
        <ThemedView style={styles.connectionStatus}>
          <ThemedView style={styles.statusContainer}>
            <MaterialIcons name="bluetooth-disabled" size={20} color="#FF0000" />
            <ThemedText style={styles.statusText}>Disconnected</ThemedText>
          </ThemedView>
          <TouchableOpacity style={styles.reconnectButton}>
            <ThemedText style={styles.reconnectText}>Reconnect</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      {/* Main Content */}
      <ThemedView style={styles.mainContent}>
        {/* Test Notification Button */}
        <TouchableOpacity style={styles.testButton}>
          <MaterialIcons name="notifications" size={40} color="#FFFFFF" />
          <ThemedText style={styles.testButtonText}>Test Notification</ThemedText>
        </TouchableOpacity>

        {/* Instruction Text */}
        <ThemedText style={styles.instructionText}>
          Press to test the emergency notification system
        </ThemedText>

        {/* BLE Connection Message */}
        <ThemedView style={styles.bleMessage}>
          <ThemedText style={styles.bleText}>
            Connect to a BLE device to enable emergency alerts
          </ThemedText>
        </ThemedView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  statusText: {
    color: '#FF0000',
    fontSize: 16,
  },
  reconnectButton: {
    backgroundColor: '#E6F0FA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  reconnectText: {
    color: '#000',
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  testButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#D3D3D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  bleMessage: {
    backgroundColor: '#E6F0FA',
    padding: 16,
    borderRadius: 8,
  },
  bleText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});