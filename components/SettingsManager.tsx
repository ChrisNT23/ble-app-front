import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the props interface for useSettingsManager
interface SettingsManagerProps {
  onSettingsSaved?: () => void;
}

// Custom hook for managing settings
const useSettingsManager = ({ onSettingsSaved }: SettingsManagerProps = {}) => {
  const [name, setName] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [emergencyMessage, setEmergencyMessage] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedName = await AsyncStorage.getItem('userName');
      const savedContact = await AsyncStorage.getItem('emergencyContact');
      const savedMessage = await AsyncStorage.getItem('emergencyMessage');
      if (savedName) setName(savedName);
      if (savedContact) setEmergencyContact(savedContact);
      if (savedMessage) setEmergencyMessage(savedMessage);
    } catch (error) {
      console.log('Error loading settings', error);
    }
  };

  const saveSettings = async () => {
    try {
      // IMPORTANTE: Esta función SOLO guarda la configuración en AsyncStorage
      // NO envía mensajes de WhatsApp ni realiza ninguna otra acción
      await AsyncStorage.setItem('userName', name);
      await AsyncStorage.setItem('emergencyContact', emergencyContact);
      await AsyncStorage.setItem('emergencyMessage', emergencyMessage);
      if (onSettingsSaved) onSettingsSaved();
    } catch (error) {
      console.log('Error saving settings', error);
    }
  };

  return {
    name,
    setName,
    emergencyContact,
    setEmergencyContact,
    emergencyMessage,
    setEmergencyMessage,
    saveSettings,
  };
};

export default useSettingsManager;