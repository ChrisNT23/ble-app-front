import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

// Define the props interface for BleDeviceManager
interface BleDeviceManagerProps {
  connectedDevice: Device | null;
  setConnectedDevice: (device: Device | null) => void;
  onDeviceConnected: (device: Device) => void;
  onScanError?: (error: Error) => void;
  onRefresh?: (startScan: () => void) => void;
  onButtonPress?: () => void;
}

// UUIDs de la placa
const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
const CHARACTERISTIC_UUID = 'abcd1234-5678-90ab-cdef-1234567890ab';

const BleDeviceManager: React.FC<BleDeviceManagerProps> = ({
  connectedDevice,
  setConnectedDevice,
  onDeviceConnected,
  onScanError,
  onRefresh,
  onButtonPress,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [hasBleScanPermission, setHasBleScanPermission] = useState(false);
  const [hasBleConnectPermission, setHasBleConnectPermission] = useState(false);
  const [hasSmsPermission, setHasSmsPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const bleManager = useRef<BleManager>(new BleManager());
  const subscriptionRef = useRef<number | null>(null); // Cambiado a number | null

  // Variable de simulación: cuando es true, se simula el envío con un Alert; cuando es false, se envía un SMS real
  const isSimulation = false; // Cambia a false antes de construir la APK para enviar SMS reales

  const checkPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const bleScanGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const bleConnectGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      const locGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const smsGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
      const backgroundPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);

      setHasBleScanPermission(bleScanGranted);
      setHasBleConnectPermission(bleConnectGranted);
      setHasLocationPermission(locGranted);
      setHasSmsPermission(smsGranted);

      console.log('Permisos verificados:', {
        BLE_SCAN: bleScanGranted,
        BLE_CONNECT: bleConnectGranted,
        LOCATION: locGranted,
        SMS: smsGranted,
        BACKGROUND: backgroundPerm,
      });

      if (!bleScanGranted || !bleConnectGranted || !locGranted) {
        console.warn('Permisos BLE faltantes, intentando re-solicitud...');
        const recheck = await requestPermissions();
        if (!recheck) return false;
      }

      return bleScanGranted && bleConnectGranted && locGranted && (isSimulation || smsGranted) && backgroundPerm;
    } catch (error) {
      console.error('Error al verificar permisos:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      ]);

      const hasBleScanPerm = granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasBleConnectPerm = granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasLocPerm = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasSmsPerm = granted['android.permission.SEND_SMS'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasBackgroundPerm = granted['android.permission.READ_PHONE_STATE'] === PermissionsAndroid.RESULTS.GRANTED;

      setHasBleScanPermission(hasBleScanPerm);
      setHasBleConnectPermission(hasBleConnectPerm);
      setHasLocationPermission(hasLocPerm);
      setHasSmsPermission(hasSmsPerm);

      console.log('Permisos solicitados:', {
        BLE_SCAN: hasBleScanPerm,
        BLE_CONNECT: hasBleConnectPerm,
        LOCATION: hasLocPerm,
        SMS: hasSmsPerm,
        BACKGROUND: hasBackgroundPerm,
      });

      if (!hasBleScanPerm || !hasBleConnectPerm || !hasLocPerm) {
        Alert.alert(
          'Permisos BLE requeridos',
          'La app necesita permisos de Bluetooth y ubicación. Ve a Ajustes > Aplicaciones > Ble-Connection > Permisos y habilítalos manualmente.',
          [{ text: 'Ir a Ajustes', onPress: () => Linking.openSettings() }]
        );
        return false;
      }
      if (!hasSmsPerm && !isSimulation) {
        Alert.alert(
          'Permiso de SMS requerido',
          'La app necesita permiso para enviar SMS. Ve a Ajustes > Aplicaciones > Ble-Connection > Permisos y habilita SMS.',
          [{ text: 'Ir a Ajustes', onPress: () => Linking.openSettings() }]
        );
      }
      if (!hasBackgroundPerm) {
        Alert.alert(
          'Permiso en segundo plano requerido',
          'La app necesita permisos en segundo plano para BLE. Ve a Ajustes > Privacidad > Gestionar permisos en segundo plano y habilítalo.',
          [{ text: 'Ir a Ajustes', onPress: () => Linking.openSettings() }]
        );
      }

      return hasBleScanPerm && hasBleConnectPerm && hasLocPerm && (isSimulation || hasSmsPerm) && hasBackgroundPerm;
    } catch (error) {
      console.error('Error al solicitar permisos:', error instanceof Error ? error.message : 'Unknown error');
      onScanError?.(new Error('Error al solicitar permisos: ' + (error instanceof Error ? error.message : 'Unknown error')));
      return false;
    }
  };

  const startScan = async () => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }

    const hasPermissions = await checkPermissions();
    console.log('Permisos verificados en startScan:', {
      hasBleScanPermission,
      hasBleConnectPermission,
      hasLocationPermission,
      hasSmsPermission,
    });

    if (!hasPermissions) {
      Alert.alert(
        'Error de permisos',
        'Permisos BLE no otorgados. Ve a Ajustes > Aplicaciones > Ble-Connection > Permisos y habilita Bluetooth, Acceso a dispositivos cercanos y Ubicación. Asegúrate de que el Bluetooth esté encendido y desactiva la optimización de batería en Ajustes > Batería. Reinicia la app si persiste.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Ajustes', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    try {
      setIsScanning(true);
      setDevices([]);
      console.log('Iniciando escaneo de dispositivos BLE...');
      bleManager.current.startDeviceScan([SERVICE_UUID], null, (error: Error | null, device: Device | null) => {
        if (error) {
          console.error('Error durante el escaneo:', error.message);
          onScanError?.(new Error(error.message));
          setIsScanning(false);
          return;
        }
        if (device && device.name) {
          console.log('Dispositivo encontrado:', device.name, device.id);
          setDevices((prevDevices) => {
            if (!prevDevices.some((d) => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      });
      setTimeout(() => {
        bleManager.current.stopDeviceScan();
        setIsScanning(false);
        console.log('Escaneo detenido después de 5 segundos');
      }, 5000);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error al iniciar escaneo:', error.message);
        onScanError?.(new Error(error.message));
      } else {
        console.error('Error al iniciar escaneo:', 'Unknown error');
        onScanError?.(new Error('Unknown error'));
      }
      setIsScanning(false);
    }
  };

  const connectToDevice = async (deviceId: string) => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }

    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      try {
        console.log('Intentando conectar a:', device.name, device.id);
        const connectedDevice = await bleManager.current.connectToDevice(device.id);
        await connectedDevice.discoverAllServicesAndCharacteristics();
        setConnectedDevice(connectedDevice);
        onDeviceConnected(connectedDevice);
        await monitorButtonPress(connectedDevice);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error al conectar:', error.message);
          onScanError?.(new Error('Error al conectar: ' + error.message));
        } else {
          console.error('Error al conectar:', 'Unknown error');
          onScanError?.(new Error('Error al conectar: Unknown error'));
        }
        setConnectedDevice(null);
      }
    }
  };

  const disconnectDevice = async () => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }
    if (!connectedDevice) {
      onScanError?.(new Error('No device connected'));
      return;
    }
    try {
      await bleManager.current.cancelDeviceConnection(connectedDevice.id);
      console.log('Dispositivo desconectado exitosamente');
      setConnectedDevice(null);
      setDevices([]);
      startScan();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error al desconectar:', error.message);
      } else {
        console.error('Error al desconectar:', 'Unknown error');
      }
      setConnectedDevice(null);
      setDevices([]);
      startScan();
    }
  };

  const getLocation = async () => {
    if (isSimulation) {
      console.log('Usando ubicación simulada para modo simulación');
      return Promise.resolve({
        latitude: 4.7110, // Ejemplo: Bogotá, Colombia
        longitude: -74.0721,
      });
    }

    if (!hasLocationPermission) {
      return Promise.reject(new Error('Location permission not granted'));
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return Promise.reject(new Error('Location permission denied'));
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      if (error instanceof Error) {
        return Promise.reject(error);
      }
      return Promise.reject(new Error('Unknown error'));
    }
  };

const sendEmergencyMessage = async () => {
  const hasPermissions = await checkPermissions();
  console.log('Permisos antes de enviar SMS:', {
    hasBleScanPermission,
    hasBleConnectPermission,
    hasLocationPermission,
    hasSmsPermission,
  });
  if (!hasPermissions) {
    Alert.alert(
      'Error de permisos',
      'Permisos no otorgados. Ve a Ajustes > Aplicaciones > Ble-Connection > Permisos y habilita los permisos necesarios.',
      [{ text: 'Ir a Ajustes', onPress: () => Linking.openSettings() }]
    );
    return;
  }

  try {
    const emergencyContact = await AsyncStorage.getItem('emergencyContact');
    const emergencyMessage = await AsyncStorage.getItem('emergencyMessage');
    const userName = await AsyncStorage.getItem('userName');

    if (!emergencyContact || !emergencyMessage || !userName) {
      Alert.alert('Error', 'Falta información de emergencia. Por favor, completa la configuración.');
      return;
    }

    const location = await getLocation();
    const locationUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = `${emergencyMessage} - Enviado por ${userName}\nUbicación: ${locationUrl}`;

    const { result } = await SMS.sendSMSAsync([emergencyContact], message);
    if (result === 'sent') {
      Alert.alert('Éxito', 'Mensaje de emergencia enviado con ubicación');
    } else {
      throw new Error('Failed to send SMS');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error en sendEmergencyMessage:', error.message);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje o obtener la ubicación');
    } else {
      console.error('Error en sendEmergencyMessage:', 'Unknown error');
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje o obtener la ubicación');
    }
  }
};

  const monitorButtonPress = async (device: Device) => {
    try {
      console.log('Iniciando monitoreo de pulsaciones de botón BLE...');
      const pollCharacteristic = async () => {
        if (!subscriptionRef.current) {
          subscriptionRef.current = setInterval(async () => {
            try {
              const characteristic = await device.readCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID);
              if (characteristic?.value) {
                console.log('Valor raw recibido:', characteristic.value);
                const decoded = atob(characteristic.value).trim();
                console.log('Valor decodificado desde la placa BLE:', decoded);

                if (decoded === '1') {
                  console.log('Botón presionado en la placa, enviando mensaje de emergencia...');
                  sendEmergencyMessage();
                  if (onButtonPress) onButtonPress();
                } else {
                  console.log('Valor recibido no es "1":', decoded);
                }
              }
            } catch (error) {
              if (error instanceof Error) {
                console.error('Error al leer característica:', error.message);
              } else {
                console.error('Error al leer característica:', 'Unknown error');
              }
              clearInterval(subscriptionRef.current!);
              subscriptionRef.current = null;
            }
          }, 1000); // Polling cada 1 segundo
        }
      };

      await pollCharacteristic();
      console.log('Monitoreo configurado con polling');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error al configurar el monitoreo:', error.message);
      } else {
        console.error('Error al configurar el monitoreo:', 'Unknown error');
      }
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE no soportado o BleManager no inicializado'));
      return;
    }

    const initializeBle = async () => {
      const hasPermissions = await requestPermissions();
      if (hasPermissions && !connectedDevice) {
        startScan();
      } else if (!hasPermissions) {
        const recheckPermissions = await checkPermissions();
        if (!recheckPermissions) {
          Alert.alert(
            'Error de permisos',
            'Permisos BLE no otorgados. Ve a Ajustes > Aplicaciones > Ble-Connection > Permisos y habilita Bluetooth. Asegúrate de que el Bluetooth esté encendido y desactiva la optimización de batería en ' +
              (Platform.OS === 'android' ? 'Ajustes > Batería' : 'los ajustes del sistema').toLowerCase() +
              '.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Ir a Ajustes', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          startScan();
        }
      }
    };

    initializeBle();

    return () => {
      bleManager.current.destroy();
      if (connectedDevice) {
        bleManager.current.cancelDeviceConnection(connectedDevice.id).catch((error: Error) => {
          console.error('Error al limpiar conexión:', error.message);
        });
      }
      if (subscriptionRef.current) {
        clearInterval(subscriptionRef.current);
        console.log('Monitoreo eliminado al desmontar componente');
        subscriptionRef.current = null;
      }
    };
  }, [connectedDevice]);

  useEffect(() => {
    let interval: number;
    if (isScanning) {
      interval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    if (onRefresh) {
      onRefresh(startScan);
    }
  }, [onRefresh]);

  return (
    <ThemedView style={styles.container}>
      {Platform.OS === 'web' ? (
        <ThemedText style={styles.webMessage}>Bluetooth functionality is not available on web.</ThemedText>
      ) : (
        <>
          <ThemedText style={styles.title}>Dispositivos Disponibles</ThemedText>
          {connectedDevice ? (
            <>
              <ThemedText style={styles.connectedText}>
                Conectado a: {connectedDevice.name || 'Unnamed Device'}
              </ThemedText>
              <TouchableOpacity onPress={disconnectDevice} style={styles.disconnectButton}>
                <ThemedText style={styles.disconnectText}>Desconectar</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {isScanning && <ThemedText style={[styles.scanningText, isBlinking && styles.blinking]}>Escaneando...</ThemedText>}
              {devices.map((device) => (
                <ThemedView key={device.id} style={styles.deviceItem}>
                  <ThemedText style={styles.deviceName}>{device.name || 'Unnamed Device'}</ThemedText>
                  <TouchableOpacity onPress={() => connectToDevice(device.id)} style={styles.connectButton}>
                    <ThemedText style={styles.connectText}>Conectar</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ))}
              {!isScanning && (
                <TouchableOpacity onPress={startScan} style={styles.refreshButton}>
                  <ThemedText style={styles.refreshText}>Recargar</ThemedText>
                  <Icon name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webMessage: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  scanningText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  blinking: {
    opacity: 0.5,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deviceName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  connectText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  connectedText: {
    fontSize: 16,
    color: '#34C759',
    marginBottom: 12,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: 12,
  },
  disconnectText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: 12,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
});

export default BleDeviceManager;