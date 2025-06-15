import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useState, useEffect } from 'react';

const API_URL = 'https://ble-app-back.onrender.com/api';

interface Settings {
  _id?: string;
  name: string;
  emergencyContact: string;
  emergencyMessage: string;
}

interface UseSettingsReturn {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  saveSettings: (newSettings: Settings) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<Settings>({
    name: '',
    emergencyContact: '',
    emergencyMessage: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        console.log('No user data found in AsyncStorage');
        return;
      }

      const { token } = JSON.parse(userData);
      if (!token) {
        console.log('No token found in user data');
        return;
      }

      console.log('Loading settings with token:', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await axios.get(`${API_URL}/settings`);
      console.log('Settings API response:', response.data);

      if (response.data.success && response.data.data) {
        const settingsData = response.data.data;
        console.log('Setting new settings data:', settingsData);
        setSettings(settingsData);
        // Guardar en AsyncStorage como respaldo
        await AsyncStorage.setItem('settings', JSON.stringify(settingsData));
      } else {
        console.log('No settings data in response');
        setSettings({
          name: '',
          emergencyContact: '',
          emergencyMessage: ''
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      setError(error.message || 'Error al cargar la configuración');
      setSettings({
        name: '',
        emergencyContact: '',
        emergencyMessage: ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      setIsLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        throw new Error('No se encontró información del usuario');
      }

      const { token } = JSON.parse(userData);
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      let response;
      if (settings._id) {
        console.log('Updating existing settings with ID:', settings._id);
        response = await axios.put(`${API_URL}/settings/${settings._id}`, newSettings);
      } else {
        console.log('Creating new settings');
        response = await axios.post(`${API_URL}/settings`, newSettings);
      }

      console.log('Settings save response:', response.data);

      if (response.data.success && response.data.data) {
        const savedSettings = response.data.data;
        setSettings(savedSettings);
        // Guardar en AsyncStorage como respaldo
        await AsyncStorage.setItem('settings', JSON.stringify(savedSettings));
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      setError(error.message || 'Error al guardar la configuración');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar settings al montar el componente y cuando cambie el token
  useEffect(() => {
    const checkAndLoadSettings = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        await loadSettings();
      }
    };
    
    checkAndLoadSettings();
  }, []);

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    loadSettings
  };
}; 