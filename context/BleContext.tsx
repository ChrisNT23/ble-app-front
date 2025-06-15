import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Device, BleManager } from 'react-native-ble-plx';

interface BleContextType {
  connectedDevice: Device | null;
  setConnectedDevice: (device: Device | null) => void;
  disconnectFromDevice: () => Promise<void>;
}

const BleContext = createContext<BleContextType | undefined>(undefined);

export function BleProvider({ children }: { children: React.ReactNode }) {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const bleManager = useRef<BleManager | null>(null);

  useEffect(() => {
    bleManager.current = new BleManager();
    return () => {
      if (bleManager.current) {
        bleManager.current.destroy();
      }
    };
  }, []);

  const disconnectFromDevice = async () => {
    try {
      if (connectedDevice && bleManager.current) {
        await bleManager.current.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
      }
    } catch (error) {
      console.error('Error al desconectar dispositivo:', error);
    }
  };

  return (
    <BleContext.Provider value={{ connectedDevice, setConnectedDevice, disconnectFromDevice }}>
      {children}
    </BleContext.Provider>
  );
}

export function useBle() {
  const context = useContext(BleContext);
  if (context === undefined) {
    throw new Error('useBle must be used within a BleProvider');
  }
  return context;
} 