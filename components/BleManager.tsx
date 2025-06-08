import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import Geolocation from 'react-native-geolocation-service';
import SMS from 'react-native-sms';
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

// Instantiate BleManager with error handling, but skip on web
let manager: BleManager | null = null;
if (Platform.OS !== 'web') {
  try {
    manager = new BleManager();
    console.log('BleManager initialized successfully with version:', require('react-native-ble-plx/package.json').version);
  } catch (error) {
    console.error('Failed to initialize BleManager:', error);
  }
} else {
  console.warn('BLE functionality is not supported on web. Skipping BleManager initialization.');
}

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
  const [hasSmsPermission, setHasSmsPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const subscriptionRef = useRef<any>(null); // Para rastrear la suscripción

  // Variable de simulación: cuando es true, se simula el envío con un Alert; cuando es false, se envía un SMS real
  const isSimulation = true; // Cambia a false antes de construir la APK para enviar SMS reales

  // Request BLE, SMS, and Location permissions on Android
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !manager) return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
      ]);

      console.log('Permisos solicitados:', granted);

      const hasBlePermissions =
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;

      const hasSmsPerm = granted['android.permission.SEND_SMS'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasLocPerm = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;

      setHasSmsPermission(hasSmsPerm);
      setHasLocationPermission(hasLocPerm);

      if (!hasBlePermissions) {
        console.warn('Permisos BLE no otorgados:', granted);
        onScanError?.(new Error('Permisos BLE no otorgados'));
        return false;
      }
      if (!hasSmsPerm) {
        console.warn('SMS permission not granted');
      }
      if (!hasLocPerm) {
        console.warn('Location permission not granted');
      }

      return hasBlePermissions;
    } catch (error) {
      if ((error as any) instanceof Error) {
        console.error('Error al solicitar permisos:', (error as Error).message);
        onScanError?.(new Error('Error al solicitar permisos: ' + (error as Error).message));
      } else {
        console.error('Error inesperado al solicitar permisos:', error);
        onScanError?.(new Error('Error inesperado al solicitar permisos'));
      }
      return false;
    }
  };

  // Iniciar escaneo de dispositivos
  const startScan = async () => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }
    if (!manager) {
      onScanError?.(new Error('BleManager not initialized'));
      return;
    }
    try {
      setIsScanning(true);
      setDevices([]);
      console.log('Iniciando escaneo de dispositivos BLE...');
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          if ((error as any) instanceof Error) {
            console.error('Error durante el escaneo:', (error as Error).message);
            onScanError?.(error as Error);
          } else {
            console.error('Error inesperado durante el escaneo:', error);
            onScanError?.(new Error('Error inesperado durante el escaneo'));
          }
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
        manager?.stopDeviceScan();
        setIsScanning(false);
        console.log('Escaneo detenido después de 5 segundos');
      }, 5000);
    } catch (error) {
      if ((error as any) instanceof Error) {
        console.error('Error al iniciar escaneo:', (error as Error).message);
        onScanError?.(error as Error);
      } else {
        console.error('Error inesperado al iniciar escaneo:', error);
        onScanError?.(new Error('Error inesperado al iniciar escaneo'));
      }
      setIsScanning(false);
    }
  };

  // Conectar a un dispositivo
  const connectToDevice = async (deviceId: string) => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }
    if (!manager) {
      onScanError?.(new Error('BleManager not initialized'));
      return;
    }
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      try {
        console.log('Intentando conectar a:', device.name, device.id);
        await device.connect({ timeout: 10000 });
        console.log('Conexión exitosa a:', device.name);
        setConnectedDevice(device);
        onDeviceConnected(device);
        await monitorButtonPress(device);
      } catch (error) {
        if ((error as any) instanceof Error) {
          console.error('Error al conectar:', (error as Error).message);
          onScanError?.(new Error('Error al conectar: ' + (error as Error).message));
        } else {
          console.error('Error inesperado al conectar:', error);
          onScanError?.(new Error('Error inesperado al conectar'));
        }
        setConnectedDevice(null);
      }
    }
  };

  // Desconectar dispositivo
  const disconnectDevice = async () => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }
    if (!manager || !connectedDevice) {
      onScanError?.(new Error('No device connected'));
      return;
    }
    try {
      const isConnected = await connectedDevice.isConnected();
      console.log('Estado de conexión antes de desconectar:', isConnected);

      if (isConnected) {
        console.log('Desconectando dispositivo:', connectedDevice.name || 'Unnamed Device');
        if (subscriptionRef.current) {
          subscriptionRef.current.remove();
          console.log('Suscripción eliminada antes de desconectar');
          subscriptionRef.current = null;
        }
        await connectedDevice.cancelConnection();
        console.log('Dispositivo desconectado exitosamente');
      } else {
        console.log('Dispositivo ya desconectado, omitiendo cancelación');
      }

      setConnectedDevice(null);
      setDevices([]);
      startScan();
    } catch (error) {
      if ((error as any) instanceof Error) {
        if ((error as Error).message.includes('is not connected')) {
          console.log('Dispositivo ya desconectado, ignorando error');
        } else {
          console.error('Error al desconectar:', (error as Error).message);
        }
      } else {
        console.error('Error inesperado al desconectar:', error);
      }
      setConnectedDevice(null);
      setDevices([]);
      startScan();
    }
  };

  // Obtener ubicación
  const getLocation = async () => {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (isSimulation) {
        console.log('Usando ubicación simulada para modo simulación');
        resolve({
          latitude: 4.7110, // Ejemplo: Bogotá, Colombia
          longitude: -74.0721,
        });
        return;
      }

      if (!hasLocationPermission) {
        reject(new Error('Location permission not granted'));
        return;
      }

      if (!Geolocation || !Geolocation.getCurrentPosition) {
        reject(new Error('Geolocation service not available'));
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  // Enviar mensaje de emergencia
  const sendEmergencyMessage = async () => {
    if (!isSimulation && (!hasSmsPermission || !hasLocationPermission)) {
      console.log('Verificación de permisos fallida:', { hasSmsPermission, hasLocationPermission });
      Alert.alert(
        'Error',
        'Faltan permisos para enviar SMS o acceder a la ubicación. Por favor, otorga el permiso de SMS en los ajustes de la aplicación.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Ajustes', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    } else if (isSimulation && !hasLocationPermission) {
      console.log('Verificación de permisos fallida (modo simulación):', { hasLocationPermission });
      Alert.alert('Error', 'Falta permiso para acceder a la ubicación');
      return;
    }

    try {
      console.log('Iniciando sendEmergencyMessage');
      const emergencyContact = await AsyncStorage.getItem('emergencyContact');
      const emergencyMessage = await AsyncStorage.getItem('emergencyMessage');
      const userName = await AsyncStorage.getItem('userName');

      if (!emergencyContact || !emergencyMessage || !userName) {
        console.log('Datos de emergencia faltantes:', { emergencyContact, emergencyMessage, userName });
        Alert.alert('Error', 'Falta información de emergencia. Por favor, completa la configuración.');
        return;
      }

      console.log('Obteniendo ubicación...');
      const location = await getLocation();
      console.log('Ubicación obtenida:', location);
      const locationUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const message = `${emergencyMessage} - Enviado por ${userName}\nUbicación: ${locationUrl}`;

      if (isSimulation) {
        console.log('Simulando SMS a:', emergencyContact, 'con mensaje:', message);
        Alert.alert('Simulación', `Mensaje simulado enviado a ${emergencyContact}:\n${message}`);
      } else {
        console.log('Enviando SMS real a:', emergencyContact);
        await SMS.send(
          { body: message, recipients: [emergencyContact] },
          (completed, cancelled, error) => {
            if (completed) {
              console.log('SMS enviado exitosamente con ubicación');
              Alert.alert('Éxito', 'Mensaje de emergencia enviado con ubicación');
            } else if (cancelled) {
              console.log('Envío de SMS cancelado');
              Alert.alert('Cancelado', 'El envío del mensaje fue cancelado');
            } else if (error) {
              if (typeof error === 'object' && error !== null && 'message' in error) {
                console.error('Error al enviar SMS:', (error as Error).message);
                Alert.alert('Error', 'No se pudo enviar el mensaje de emergencia');
              } else {
                console.error('Error inesperado al enviar SMS:', error);
                Alert.alert('Error', 'No se pudo enviar el mensaje de emergencia');
              }
            }
          }
        );
      }
    } catch (error) {
      if ((error as any) instanceof Error) {
        console.error('Error en sendEmergencyMessage:', (error as Error).message);
        Alert.alert('Error', 'Ocurrió un error al enviar el mensaje o obtener la ubicación');
      } else {
        console.error('Error inesperado en sendEmergencyMessage:', error);
        Alert.alert('Error', 'Ocurrió un error al enviar el mensaje o obtener la ubicación');
      }
    }
  };

  // Monitorear presión del botón
  const monitorButtonPress = async (device: Device) => {
    try {
      console.log('Iniciando monitoreo de pulsaciones de botón BLE...');
      
      // Descubrir servicios y características
      await device.discoverAllServicesAndCharacteristics();
      console.log('Servicios y características descubiertos');

      // Obtener servicios y características para depuración
      const services = await device.services();
      console.log('Servicios disponibles:', services.map(s => s.uuid));
      const characteristics = await device.characteristicsForService(SERVICE_UUID);
      console.log('Características disponibles:', characteristics.map(c => c.uuid));

      // Verificar si la característica existe
      const targetCharacteristic = characteristics.find(c => c.uuid === CHARACTERISTIC_UUID);
      if (!targetCharacteristic) {
        console.error('Característica con UUID', CHARACTERISTIC_UUID, 'no encontrada');
        return;
      }

      // Configurar la suscripción
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        console.log('Suscripción previa eliminada');
      }

      subscriptionRef.current = device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            if ((error as any) instanceof Error) {
              // Ignorar el error de "Operation was cancelled" como no crítico
              if ((error as Error).message.includes('Operation was cancelled')) {
                console.log('Monitoreo cancelado, operación esperada al desconectar');
              } else {
                console.error('Error al monitorear la característica:', (error as Error).message);
              }
            } else {
              console.error('Error inesperado al monitorear la característica:', error);
            }
            return;
          }

          if (characteristic?.value) {
            console.log('Valor raw recibido (base64):', characteristic.value); // Log del valor base64
            try {
              const decoded = atob(characteristic.value).trim(); // Decodificar base64 a string
              console.log('Valor decodificado desde la placa BLE:', decoded);

              if (decoded === '1') {
                console.log('Botón presionado en la placa, enviando mensaje de emergencia...');
                sendEmergencyMessage();
                if (onButtonPress) onButtonPress();
              } else {
                console.log('Valor recibido no es "1":', decoded);
              }
            } catch (decodeError) {
              if ((decodeError as any) instanceof Error) {
                console.error('Error al decodificar valor:', (decodeError as Error).message);
              } else {
                console.error('Error inesperado al decodificar valor:', decodeError);
              }
            }
          } else {
            console.log('Característica sin valor recibido, revisa si es notificable o si la placa envía datos');
          }
        }
      );
      console.log('Suscripción configurada con éxito');
    } catch (error) {
      if ((error as any) instanceof Error) {
        console.error('Error al configurar el monitoreo:', (error as Error).message);
      } else {
        console.error('Error inesperado al configurar el monitoreo:', error);
      }
    }
  };

  // Efecto para manejar el escaneo inicial
  useEffect(() => {
    if (Platform.OS === 'web' || !manager) {
      onScanError?.(new Error('BLE no soportado o BleManager no inicializado'));
      return;
    }

    const initializeBle = async () => {
      const hasPermissions = await requestPermissions();
      if (hasPermissions && !connectedDevice) {
        startScan();
      }
    };

    initializeBle();

    return () => {
      manager?.stopDeviceScan();
      if (connectedDevice) {
        connectedDevice.isConnected().then((isConnected) => {
          if (isConnected) {
            connectedDevice.cancelConnection().catch((error) => {
              if ((error as any) instanceof Error) {
                if (!(error as Error).message.includes('is not connected')) {
                  console.error('Error al limpiar conexión:', (error as Error).message);
                } else {
                  console.log('Dispositivo ya desconectado, ignorando error');
                }
              } else {
                console.error('Error inesperado al limpiar conexión:', error);
              }
            });
          } else {
            console.log('Dispositivo ya desconectado al desmontar, omitiendo cancelación');
          }
        }).catch((error) => {
          console.error('Error al verificar conexión al desmontar:', (error as Error).message);
        });
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        console.log('Suscripción eliminada al desmontar componente');
        subscriptionRef.current = null;
      }
    };
  }, [connectedDevice]);

  // Efecto para el parpadeo durante el escaneo
  useEffect(() => {
    let interval: number;
    if (isScanning) {
      interval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // Efecto para manejar el refresco
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