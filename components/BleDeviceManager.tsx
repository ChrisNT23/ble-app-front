import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { API_URL } from '@/config/constants';

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

interface Location {
    latitude: number;
    longitude: number;
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
  const [hasBleScanPermission, setHasBleScanPermission] = useState(false);
  const [hasBleConnectPermission, setHasBleConnectPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isBleManagerReady, setIsBleManagerReady] = useState(false);
  const bleManagerInstance = useRef<BleManager | null>(null);
  const subscriptionRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const scanTimeoutRef = useRef<number | null>(null);
  const isInitializing = useRef(false);
  const initializationAttempts = useRef(0);
  const initializationPromise = useRef<Promise<void> | null>(null);

  // Variable de simulación: cuando es true, se simula el envío con un Alert; cuando es false, se envía un SMS real
  const isSimulation = false; // Cambia a false antes de construir la APK para enviar SMS reales

  // Inicializar BleManager
  useEffect(() => {
    isMounted.current = true;
    let localBleManager: BleManager | null = null;

    const initializeBle = async () => {
      if (Platform.OS === 'web') {
        onScanError?.(new Error('BLE is not supported on web'));
        return;
      }

      // Si ya hay una inicialización en curso, esperar a que termine
      if (initializationPromise.current) {
        console.log('Esperando a que termine la inicialización en curso...');
        await initializationPromise.current;
        return;
      }

      if (isInitializing.current) {
        console.log('Ya hay una inicialización en curso...');
        return;
      }

      if (initializationAttempts.current >= 3) {
        console.error('Demasiados intentos de inicialización');
        Alert.alert(
          'Error de Bluetooth',
          'No se pudo inicializar el Bluetooth. Por favor, reinicia la aplicación.',
          [{ text: 'OK' }]
        );
        return;
      }

      try {
        isInitializing.current = true;
        initializationAttempts.current += 1;
        console.log('Inicializando BleManager... Intento:', initializationAttempts.current);

        // Crear una nueva promesa de inicialización
        initializationPromise.current = (async () => {
          // Destruir cualquier instancia existente
          if (localBleManager) {
            console.log('Destruyendo instancia anterior de BleManager...');
            localBleManager.destroy();
            localBleManager = null;
          }

          if (bleManagerInstance.current) {
            console.log('Destruyendo instancia actual de BleManager...');
            bleManagerInstance.current.destroy();
            bleManagerInstance.current = null;
          }

          // Crear nueva instancia
          localBleManager = new BleManager();
          bleManagerInstance.current = localBleManager;
          
          // Esperar a que el BleManager esté listo
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (isMounted.current) {
            setIsBleManagerReady(true);
            console.log('BleManager inicializado correctamente');
            initializationAttempts.current = 0; // Resetear contador de intentos
          }

          const hasPermissions = await requestPermissions();
          if (hasPermissions && !connectedDevice && isMounted.current) {
            startScan();
          }
        })();

        await initializationPromise.current;
      } catch (error) {
        console.error('Error al inicializar BLE:', error);
        if (isMounted.current) {
          onScanError?.(new Error('Error al inicializar BLE'));
        }
      } finally {
        isInitializing.current = false;
        initializationPromise.current = null;
      }
    };

    initializeBle();

    return () => {
      isMounted.current = false;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (subscriptionRef.current) {
        clearInterval(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (localBleManager) {
        console.log('Destruyendo BleManager...');
        localBleManager.destroy();
        bleManagerInstance.current = null;
        setIsBleManagerReady(false);
      }
    };
  }, []);

  const checkPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const bleScanGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const bleConnectGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      const locGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const backgroundPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);

      setHasBleScanPermission(bleScanGranted);
      setHasBleConnectPermission(bleConnectGranted);
      setHasLocationPermission(locGranted);

      console.log('Permisos verificados:', {
        BLE_SCAN: bleScanGranted,
        BLE_CONNECT: bleConnectGranted,
        LOCATION: locGranted,
        BACKGROUND: backgroundPerm,
      });

      if (!bleScanGranted || !bleConnectGranted || !locGranted) {
        console.warn('Permisos BLE faltantes, intentando re-solicitud...');
        const recheck = await requestPermissions();
        if (!recheck) return false;
      }

      return bleScanGranted && bleConnectGranted && locGranted && backgroundPerm;
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
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      ]);

      const hasBleScanPerm = granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasBleConnectPerm = granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasLocPerm = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      const hasBackgroundPerm = granted['android.permission.READ_PHONE_STATE'] === PermissionsAndroid.RESULTS.GRANTED;

      setHasBleScanPermission(hasBleScanPerm);
      setHasBleConnectPermission(hasBleConnectPerm);
      setHasLocationPermission(hasLocPerm);

      console.log('Permisos solicitados:', {
        BLE_SCAN: hasBleScanPerm,
        BLE_CONNECT: hasBleConnectPerm,
        LOCATION: hasLocPerm,
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
      if (!hasBackgroundPerm) {
        Alert.alert(
          'Permiso en segundo plano requerido',
          'La app necesita permisos en segundo plano para BLE. Ve a Ajustes > Privacidad > Gestionar permisos en segundo plano y habilítalo.',
          [{ text: 'Ir a Ajustes', onPress: () => Linking.openSettings() }]
        );
      }

      return hasBleScanPerm && hasBleConnectPerm && hasLocPerm && hasBackgroundPerm;
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

    try {
      // Esperar a que el BleManager esté listo si hay una inicialización en curso
      if (initializationPromise.current) {
        console.log('Esperando a que el BleManager esté listo...');
        await initializationPromise.current;
      }

      const manager = bleManagerInstance.current;
      if (!manager || !isBleManagerReady) {
        console.log('BleManager no está disponible, reiniciando...');
        if (!isInitializing.current && initializationAttempts.current < 3) {
          console.log('Iniciando nueva inicialización...');
          const newManager = new BleManager();
          bleManagerInstance.current = newManager;
          await new Promise(resolve => setTimeout(resolve, 2000));
          setIsBleManagerReady(true);
          console.log('BleManager reiniciado correctamente');
          return startScan();
        } else {
          console.error('No se pudo inicializar el BleManager después de varios intentos');
          Alert.alert(
            'Error de Bluetooth',
            'No se pudo inicializar el Bluetooth. Por favor, reinicia la aplicación.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      setIsScanning(true);
      setDevices([]);

      // Usar los UUIDs correctos del ESP32
      manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          console.error('Error al escanear:', error);
          if (isMounted.current) {
            onScanError?.(new Error('Error al escanear: ' + error.message));
          }
          return;
        }

        if (device && device.name) {
          console.log('Dispositivo encontrado:', device.name, device.id);
          setDevices((prevDevices) => {
            const exists = prevDevices.some((d) => d.id === device.id);
            if (!exists) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      });

      // Detener el escaneo después de 10 segundos
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        if (isMounted.current && bleManagerInstance.current) {
          bleManagerInstance.current.stopDeviceScan();
          setIsScanning(false);
        }
      }, 10000);
    } catch (error) {
      console.error('Error al iniciar el escaneo:', error);
      if (isMounted.current) {
        setIsScanning(false);
        onScanError?.(new Error('Error al iniciar el escaneo'));
        // Intentar reiniciar el escaneo después de un error
        setTimeout(() => {
          if (isMounted.current) {
            startScan();
          }
        }, 2000);
      }
    }
  };

  const connectToDevice = async (deviceId: string) => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }

    try {
      const manager = bleManagerInstance.current;
      if (!manager || !isBleManagerReady) {
        throw new Error('BleManager no está disponible');
      }

      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        throw new Error('Dispositivo no encontrado');
      }

      console.log('Intentando conectar a:', device.name, device.id);
      
      // Primero cancelar cualquier conexión existente
      try {
        await manager.cancelDeviceConnection(device.id);
      } catch (e) {
        console.log('No había conexión previa para cancelar');
      }

      // Intentar conectar con timeout
      const connectedDevice = await Promise.race([
        manager.connectToDevice(device.id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de conexión')), 10000)
        )
      ]) as Device;

      console.log('Dispositivo conectado, descubriendo servicios...');
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Verificar que el dispositivo sigue conectado
      const isConnected = await connectedDevice.isConnected();
      if (!isConnected) {
        throw new Error('El dispositivo se desconectó después de la conexión');
      }

      if (isMounted.current) {
        setConnectedDevice(connectedDevice);
        onDeviceConnected(connectedDevice);
        
        // Iniciar monitoreo después de una breve pausa
        setTimeout(() => {
          if (isMounted.current) {
            monitorButtonPress(connectedDevice);
          }
        }, 1000);
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error('Error al conectar:', error.message);
        if (isMounted.current) {
          Alert.alert(
            'Error de Conexión',
            'No se pudo conectar al dispositivo. Por favor, intenta de nuevo.',
            [{ text: 'OK' }]
          );
          onScanError?.(new Error('Error al conectar: ' + error.message));
        }
      } else {
        console.error('Error al conectar:', 'Unknown error');
        if (isMounted.current) {
          onScanError?.(new Error('Error al conectar: Unknown error'));
        }
      }
      if (isMounted.current) {
        setConnectedDevice(null);
      }
    }
  };

  const disconnectFromDevice = async () => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }

    try {
      const manager = bleManagerInstance.current;
      if (!manager) {
        throw new Error('BleManager no está disponible');
      }

      if (!connectedDevice) {
        console.log('No hay dispositivo conectado para desconectar');
        return;
      }

      try {
        await manager.cancelDeviceConnection(connectedDevice.id);
        console.log('Dispositivo desconectado exitosamente');
        setConnectedDevice(null);
      } catch (error) {
        console.error('Error al desconectar:', error);
        if (isMounted.current) {
          onScanError?.(new Error('Error al desconectar: ' + (error instanceof Error ? error.message : 'Unknown error')));
        }
      }
    } catch (error) {
      console.error('Error al desconectar:', error);
      if (isMounted.current) {
        onScanError?.(new Error('Error al desconectar: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    }
  };

  const getLocation = async () => {
    try {
      // Verificar y solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Se requieren permisos de ubicación para enviar la ubicación de emergencia');
      }

      // Obtener la ubicación con alta precisión
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1
      });

      console.log('Ubicación obtenida:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      throw new Error('No se pudo obtener la ubicación actual. Por favor, verifica que la ubicación esté activada.');
    }
  };

  const sendEmergencyMessage = async () => {
    try {
      console.log('Iniciando envío de mensaje de emergencia...');
      
      // Obtener la configuración actual
      const settings = await AsyncStorage.getItem('settings');
      console.log('Configuración actual:', settings);
      
      if (!settings) {
        throw new Error('No se encontró la configuración de emergencia. Por favor, configure los datos de emergencia en la sección de configuración.');
      }

      const { emergencyContact, emergencyMessage } = JSON.parse(settings);
      
      if (!emergencyContact) {
        throw new Error('No se encontró el número de emergencia. Por favor, configure un número de emergencia en la sección de configuración.');
      }

      // Obtener la ubicación actual
      const location = await getLocation();
      console.log('Ubicación obtenida:', location);

      // Construir el mensaje con la ubicación
      const messageWithLocation = `${emergencyMessage || '¡EMERGENCIA!'}\n\nMi ubicación actual:\nhttps://www.google.com/maps?q=${location.latitude},${location.longitude}`;

      // Enviar el mensaje
      const response = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: emergencyContact,
          message: messageWithLocation,
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        })
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar el mensaje');
      }

      Alert.alert(
        'Mensaje Enviado',
        'El mensaje de emergencia ha sido enviado correctamente.',
        [{ text: 'OK' }]
      );
    } catch (error: unknown) {
      console.error('Error al enviar mensaje de emergencia:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al enviar el mensaje de emergencia. Por favor, verifica tu configuración.';
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const monitorButtonPress = async (device: Device) => {
    if (Platform.OS === 'web') {
      onScanError?.(new Error('BLE is not supported on web'));
      return;
    }

    try {
      const manager = bleManagerInstance.current;
      if (!manager) {
        throw new Error('BleManager no está disponible');
      }

      console.log('Iniciando monitoreo de botón...');
      
      // Verificar que el dispositivo sigue conectado
      const isConnected = await device.isConnected();
      if (!isConnected) {
        throw new Error('El dispositivo no está conectado');
      }

      // IMPORTANTE: Esta función SOLO envía mensajes cuando se recibe el valor "1" del dispositivo
      // No se debe enviar mensajes en ningún otro caso
      console.log('Monitoreando botón para valor "1"...');

      // Suscribirse a las notificaciones
      await device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        handleCharacteristicValueChange
      );

      console.log('Monitoreo de botón iniciado correctamente');
    } catch (error) {
      console.error('Error al iniciar monitoreo:', error);
      if (isMounted.current) {
        onScanError?.(new Error('Error al iniciar monitoreo: ' + (error instanceof Error ? error.message : 'Unknown error')));
        // Intentar reconectar si hay un error
        setConnectedDevice(null);
        startScan();
      }
    }
  };

  const decodeBase64 = (base64: string): string => {
    try {
        // En React Native, usamos atob para decodificar base64
        return atob(base64);
    } catch (error) {
        console.error('Error al decodificar base64:', error);
        return '';
    }
  };

  const handleCharacteristicValueChange = (error: Error | null, characteristic: any) => {
    if (error) {
        console.error('Error en la característica:', error);
        return;
    }

    if (characteristic?.value) {
        const value = decodeBase64(characteristic.value);
        console.log('Valor recibido:', value);
        
        if (value === '1') {
            console.log('¡Botón presionado! Enviando mensaje de emergencia...');
            // Usar una función async inmediatamente invocada
            (async () => {
                try {
                    await sendEmergencyMessage();
                } catch (error) {
                    console.error('Error al procesar la emergencia:', error);
                }
            })();
        } else {
            console.log('Valor recibido diferente de "1", no se envía mensaje');
        }
    }
  };

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
              <TouchableOpacity onPress={disconnectFromDevice} style={styles.disconnectButton}>
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
    backgroundColor: '#A0B3C5',
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