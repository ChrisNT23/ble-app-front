import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useBle } from '../../context/BleContext';
import { useSettings } from '../../hooks/useSettings';
import { usePhoneValidation } from '@/hooks/usePhoneValidation';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Notification from '@/components/Notification';

export default function SettingsScreen() {
  const { connectedDevice, disconnectFromDevice } = useBle();
  const { settings, isLoading, error, saveSettings, loadSettings } = useSettings();
  const [isEditable, setIsEditable] = useState(!settings._id);
  const [name, setName] = useState(settings.name);
  const [emergencyContact, setEmergencyContact] = useState(settings.emergencyContact);
  const [emergencyMessage, setEmergencyMessage] = useState(settings.emergencyMessage);
  const [notification, setNotification] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    visible: false,
    type: 'success',
    message: '',
  });

  const { validatePhone, error: phoneError } = usePhoneValidation();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setName(parsedData.name || '');
          setEmergencyContact(parsedData.emergencyContact || '');
          setEmergencyMessage(parsedData.emergencyMessage || '');
          setIsEditable(!parsedData.name && !parsedData.emergencyContact && !parsedData.emergencyMessage);
          await loadSettings();
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setEmergencyContact(settings.emergencyContact || '');
      setEmergencyMessage(settings.emergencyMessage || '');
      setIsEditable(!settings.name && !settings.emergencyContact && !settings.emergencyMessage);
    }
  }, [settings]);

  // Formatear número de teléfono
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+593')) {
      return '+593' + cleaned.replace('+593', '');
    }
    return cleaned;
  };

  const handleSave = async () => {
    try {
      if (!name.trim() || !emergencyContact.trim() || !emergencyMessage.trim()) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }

      const formattedNumber = formatPhoneNumber(emergencyContact);
      if (!formattedNumber) {
        Alert.alert('Error', 'Número de teléfono inválido');
        return;
      }

      await saveSettings({
        name: name.trim(),
        emergencyContact: formattedNumber,
        emergencyMessage: emergencyMessage.trim()
      });

      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al guardar la configuración'
      );
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              if (connectedDevice) {
                await disconnectFromDevice();
              }
              await AsyncStorage.removeItem('userData');
              await AsyncStorage.removeItem('settings');
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión correctamente');
            }
          }
        }
      ]
    );
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setEmergencyContact(formatted);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Notification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))}
      />

      {/* Header with Title */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Información Personal</ThemedText>
      </ThemedView>

      {/* Form Section */}
      <ThemedView style={styles.form}>
        {/* Your Name */}
        <ThemedText style={styles.label}>Ingrese su nombre:</ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ingrese su nombre"
          editable={isEditable}
        />

        {/* Emergency Contact */}
        <ThemedText style={styles.label}>Número de WhatsApp de Emergencia:</ThemedText>
        <TextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          placeholder="Número de emergencia (ej: +593964194669)"
          value={emergencyContact}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          editable={isEditable}
        />
        {phoneError && (
          <ThemedText style={styles.errorText}>{phoneError}</ThemedText>
        )}

        {/* Emergency Message */}
        <ThemedText style={styles.label}>Mensaje de WhatsApp de Emergencia:</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={emergencyMessage}
          onChangeText={setEmergencyMessage}
          placeholder="Mensaje que se enviará en caso de emergencia"
          multiline
          numberOfLines={4}
          editable={isEditable}
        />

        {/* Save Button */}
        {isEditable ? (
          <TouchableOpacity
            style={[styles.button, (isLoading || !!phoneError) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading || !!phoneError}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.buttonText}>Guardar Configuración</ThemedText>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => setIsEditable(true)}>
            <ThemedText style={styles.buttonText}>Editar Configuración</ThemedText>
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  notification: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 25,
    alignItems: 'center',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A0B3C5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 16,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});