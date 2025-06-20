import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { useBle } from '../../context/BleContext';
import { useSettings } from '../../hooks/useSettings';
import { usePhoneValidation } from '@/hooks/usePhoneValidation';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Notification from '@/components/Notification';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Colores adaptativos para modo claro/oscuro
  const colors = {
    background: isDark ? '#1C1C1E' : '#F8F9FA',
    cardBackground: isDark ? '#2C2C2E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#333333',
    textSecondary: isDark ? '#8E8E93' : '#666666',
    placeholder: isDark ? '#C7C7CC' : '#999999',
    border: isDark ? '#38383A' : '#E9ECEF',
    inputBackground: isDark ? '#3A3A3C' : '#FFFFFF',
    inputBorder: isDark ? '#48484A' : '#E9ECEF',
    error: '#FF3B30',
    success: '#34C759',
  };

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

  const showEmergencyContactInfo = () => {
    Alert.alert(
      'Contacto de Emergencia',
      'Este número recibirá el mensaje de emergencia cuando se active la alerta. Asegúrate de que sea un número de WhatsApp válido.',
      [{ text: 'Entendido' }]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.text} />
        <ThemedText style={[styles.loadingText, { color: colors.textSecondary, marginTop: 20 }]}>
          Cargando configuración...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <Notification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))}
      />

      {/* Header with Title and Icon */}
      <ThemedView style={[styles.header, { 
        backgroundColor: colors.cardBackground,
        borderBottomColor: colors.border 
      }]}>
        <Icon name="user-circle" size={40} color="#A0B3C5" style={styles.headerIcon} />
        <ThemedText type="title" style={[styles.headerTitle, { color: colors.text }]}>
          Información Personal
        </ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Configura tus datos de emergencia
        </ThemedText>
      </ThemedView>

      {/* Scrollable Form Section */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Your Name */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.labelIcon} />
            <ThemedText style={[styles.label, { color: colors.text }]}>Nombre completo</ThemedText>
          </View>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text
            }]}
            value={name}
            onChangeText={setName}
            placeholder="Ingresa tu nombre completo"
            placeholderTextColor={colors.placeholder}
            editable={isEditable}
          />
        </View>

        {/* Emergency Contact */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.labelIcon} />
            <ThemedText style={[styles.label, { color: colors.text }]}>Contacto de emergencia</ThemedText>
            <TouchableOpacity onPress={showEmergencyContactInfo} style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground,
              borderColor: phoneError ? colors.error : colors.inputBorder,
              color: colors.text
            }]}
            placeholder="+593 99 123 4567"
            placeholderTextColor={colors.placeholder}
            value={emergencyContact}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            editable={isEditable}
          />
          {phoneError && (
            <ThemedText style={[styles.errorText, { color: colors.error }]}>{phoneError}</ThemedText>
          )}
        </View>

        {/* Emergency Message */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} style={styles.labelIcon} />
            <ThemedText style={[styles.label, { color: colors.text }]}>Mensaje de emergencia</ThemedText>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text
            }]}
            value={emergencyMessage}
            onChangeText={setEmergencyMessage}
            placeholder="Mensaje que se enviará en caso de emergencia..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            editable={isEditable}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isEditable ? (
            <TouchableOpacity
              style={[styles.button, (isLoading || !!phoneError) && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isLoading || !!phoneError}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <ThemedText style={styles.buttonText}>Guardar Configuración</ThemedText>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={() => setIsEditable(true)}>
              <Ionicons name="create-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <ThemedText style={styles.buttonText}>Editar Configuración</ThemedText>
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notification: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  header: {
    padding: 25,
    borderBottomWidth: 1,
    marginTop: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerIcon: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  input: {
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 30,
    gap: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A0B3C5',
    padding: 15,
    borderRadius: 12,
    height: 50,
    minWidth: 200,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
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
    backgroundColor: '#ff6961',
    padding: 15,
    borderRadius: 12,
    height: 50,
    minWidth: 200,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
});