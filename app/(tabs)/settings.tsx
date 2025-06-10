import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// URL de producción
const API_URL = 'https://ble-app-back.onrender.com/api';

export default function SettingsScreen() {
  const [name, setName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isEditable, setIsEditable] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    const loadUserAndSettings = async () => {
      try {
        // Primero cargar el ID del usuario y token desde AsyncStorage
        const userData = await AsyncStorage.getItem('userData');
        console.log('UserData from AsyncStorage:', userData);

        if (!userData) {
          Alert.alert('Error', 'No se encontró información del usuario');
          router.replace('/(auth)/login');
          return;
        }

        const { id, token: userToken } = JSON.parse(userData);
        console.log('User ID:', id);
        console.log('User Token:', userToken);

        setUserId(id);
        setToken(userToken);

        // Configurar el token en axios para todas las peticiones
        axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

        // Intentar cargar la configuración del usuario desde el backend
        let attempts = 3;
        let success = false;
        let settings = null;

        while (attempts > 0 && !success) {
          try {
            console.log('Attempting to fetch settings for user:', id);
            const response = await axios.get(`${API_URL}/settings/${id}`, { timeout: 5000 });
            console.log('Settings response:', response.data);
            settings = response.data;
            success = true;
          } catch (error: any) {
            console.warn(`Attempt ${4 - attempts} failed:`, error.message || 'Unknown error');
            console.log('Error details:', error.response?.data);
            
            // Si es un error 404, significa que es un usuario nuevo
            if (error.response?.status === 404) {
              console.log('New user detected, initializing empty settings');
              settings = {
                userId: id,
                name: '',
                emergencyContact: '',
                emergencyMessage: '',
                isNew: true
              };
              success = true;
            } else {
              attempts--;
              if (attempts === 0) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (settings) {
          // Si es un usuario nuevo o no tiene configuración
          if (settings.isNew || !settings.name) {
            setName('');
            setEmergencyContact('');
            setEmergencyMessage('');
            setIsEditable(true);
          } else {
            // Si tiene configuración existente
            setName(settings.name || '');
            setEmergencyContact(settings.emergencyContact || '');
            setEmergencyMessage(settings.emergencyMessage || '');
            setSettingsId(settings._id);
            setIsEditable(false);
          }
        } else {
          // Fallback a AsyncStorage si todo falla
          console.log('No settings found, loading from AsyncStorage');
          const savedName = await AsyncStorage.getItem(`userName_${id}`);
          const savedContact = await AsyncStorage.getItem(`emergencyContact_${id}`);
          const savedMessage = await AsyncStorage.getItem(`emergencyMessage_${id}`);
          console.log('Saved data from AsyncStorage:', { savedName, savedContact, savedMessage });
          if (savedName) setName(savedName);
          if (savedContact) setEmergencyContact(savedContact);
          if (savedMessage) setEmergencyMessage(savedMessage);
          setIsEditable(true);
        }
      } catch (error: any) {
        console.error('Error loading settings:', error.message || error);
        console.log('Full error object:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos de configuración');
      }
    };

    loadUserAndSettings();
  }, []);

  // Guardar o actualizar datos
  const saveSettings = async () => {
    if (!userId || !token) {
      Alert.alert('Error', 'No se encontró información del usuario');
      return;
    }

    try {
      const settings = { 
        userId,
        name, 
        emergencyContact, 
        emergencyMessage 
      };

      // Validar y formatear el número de emergencia
      let formattedContact = emergencyContact.trim();
      if (formattedContact && !formattedContact.startsWith('+593')) {
        if (formattedContact.startsWith('0')) {
          formattedContact = '+593' + formattedContact.slice(1);
        } else {
          formattedContact = '+593' + formattedContact;
        }
      }

      if (!formattedContact || !emergencyMessage || !name) {
        Alert.alert('Error', 'Por favor, completa todos los campos.');
        return;
      }

      const updatedSettings = { 
        userId,
        name, 
        emergencyContact: formattedContact, 
        emergencyMessage 
      };

      let response;
      if (settingsId) {
        response = await axios.put(`${API_URL}/settings/${settingsId}`, updatedSettings);
        console.log('Settings updated:', response.data);
      } else {
        response = await axios.post(`${API_URL}/settings`, updatedSettings);
        const newId = response.data._id;
        if (newId) {
          setSettingsId(newId);
          console.log('Settings created with ID:', newId);
        }
      }

      // Guardar en AsyncStorage como respaldo
      await AsyncStorage.setItem(`userName_${userId}`, name);
      await AsyncStorage.setItem(`emergencyContact_${userId}`, formattedContact);
      await AsyncStorage.setItem(`emergencyMessage_${userId}`, emergencyMessage);

      setIsEditable(false);
      Alert.alert('Éxito', 'Configuración guardada correctamente');

      // Recargar los datos después de guardar
      await loadSettingsAgain();
    } catch (error: any) {
      console.error('Error saving settings:', error.message || error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  // Función para recargar los datos
  const loadSettingsAgain = async () => {
    if (!userId) return;

    try {
      const response = await axios.get(`${API_URL}/settings/${userId}`, { timeout: 5000 });
      const settings = response.data;
      if (settings && settings._id) {
        setName(settings.name || '');
        setEmergencyContact(settings.emergencyContact || '');
        setEmergencyMessage(settings.emergencyMessage || '');
        setSettingsId(settings._id);
        console.log('Reloaded settings with ID:', settings._id);
      }
    } catch (error: any) {
      console.error('Error reloading settings after save:', error.message || error);
    }
  };

  // Habilitar edición
  const enableEditing = () => {
    setIsEditable(true);
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
              await AsyncStorage.removeItem('userData');
              router.replace('/(auth)/login');
            } catch (error: any) {
              console.error('Error al cerrar sesión:', error.message || error);
              Alert.alert('Error', 'No se pudo cerrar sesión correctamente');
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
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
          placeholderTextColor="#888"
          editable={isEditable}
        />

        {/* Emergency Contact */}
        <ThemedText style={styles.label}>Ingrese su contacto de emergencia:</ThemedText>
        <TextInput
          style={styles.input}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder="Ingrese un número de celular"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          editable={isEditable}
        />

        {/* Emergency Message */}
        <ThemedText style={styles.label}>Mensaje de emergencia:</ThemedText>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={emergencyMessage}
          onChangeText={setEmergencyMessage}
          placeholder="Ingrese el mensaje a enviar"
          placeholderTextColor="#888"
          multiline
          editable={isEditable}
        />

        {/* Botones condicionales */}
        {isEditable ? (
          <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
            <MaterialIcons name="save" size={20} color="#FFF" style={styles.saveIcon} />
            <ThemedText style={styles.saveText}>Guardar información</ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={enableEditing}>
            <MaterialIcons name="edit" size={20} color="#FFF" style={styles.editIcon} />
            <ThemedText style={styles.editText}>Editar</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#FF3B30" />
          <ThemedText style={styles.logoutText}>Cerrar Sesión</ThemedText>
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
  messageInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A0B3C5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  editIcon: {
    marginRight: 8,
  },
  editText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});