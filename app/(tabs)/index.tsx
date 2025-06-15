import { Image, TouchableOpacity, StyleSheet, View, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accuracy } from 'expo-location';
import { getCurrentPositionAsync } from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSettings } from '../../hooks/useSettings';

const API_URL = 'https://ble-app-back.onrender.com/api';

export default function HomeScreen() {
  const { settings } = useSettings();

  const handleEmergencyMessage = async () => {
    try {
      console.log('¡Botón presionado! Enviando mensaje de emergencia...');
      console.log('Iniciando envío de mensaje de emergencia...');
      console.log('Configuración actual:', settings);

      if (!settings || !settings.emergencyContact || !settings.emergencyMessage) {
        Alert.alert('Error', 'Por favor configura tus datos de emergencia en la sección de configuración');
        return;
      }

      // Obtener ubicación actual
      let location;
      try {
        location = await getCurrentPositionAsync({
          accuracy: Accuracy.High,
          timeInterval: 5000,
        });
        console.log('Ubicación obtenida:', location);
      } catch (locationError) {
        console.error('Error al obtener ubicación:', locationError);
        Alert.alert('Error', 'No se pudo obtener la ubicación actual');
        return;
      }

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        Alert.alert('Error', 'No se encontró información del usuario');
        return;
      }

      const { token } = JSON.parse(userData);
      if (!token) {
        Alert.alert('Error', 'No se encontró el token de autenticación');
        return;
      }

      const messageData = {
        to: settings.emergencyContact,
        message: settings.emergencyMessage,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      };

      console.log('Enviando mensaje con datos:', messageData);
      console.log('URL del endpoint:', `${API_URL}/whatsapp/send`);

      const response = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      });

      // Log de la respuesta completa para debugging
      console.log('Status de la respuesta:', response.status);
      console.log('Headers de la respuesta:', response.headers);

      const responseText = await response.text();
      console.log('Respuesta del servidor (texto):', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error al parsear la respuesta:', parseError);
        throw new Error('Error en la respuesta del servidor');
      }

      if (!response.ok) {
        throw new Error(responseData.message || `Error del servidor: ${response.status}`);
      }

      if (responseData.success) {
        Alert.alert('Éxito', 'Mensaje de emergencia enviado correctamente');
      } else {
        throw new Error(responseData.message || 'Error al enviar el mensaje');
      }
    } catch (error) {
      console.error('Error al enviar mensaje de emergencia:', error);
      Alert.alert(
        'Error',
        'No se pudo enviar el mensaje de emergencia. Por favor, intenta nuevamente.'
      );
    }
  };

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
        <TouchableOpacity style={styles.testButton} onPress={handleEmergencyMessage}>
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
    padding: 20,
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