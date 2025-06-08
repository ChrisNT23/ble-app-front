import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function SettingsScreen() {
  const [name, setName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [settingsId, setSettingsId] = useState(null);
  const [isEditable, setIsEditable] = useState(true);

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Intentar cargar desde el backend con reintentos
        let attempts = 3;
        let success = false;
        let settings = null;

        while (attempts > 0 && !success) {
          try {
            const response = await axios.get('https://ble-app-back.onrender.com/settings', { timeout: 5000 }); // Reemplaza con tu IP
            settings = response.data;
            success = true;
          } catch (error: any) {
            console.warn(`Attempt ${4 - attempts} failed:`, error.message || 'Unknown error');
            attempts--;
            if (attempts === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (settings && settings._id) {
          setName(settings.name || '');
          setEmergencyContact(settings.emergencyContact || '');
          setEmergencyMessage(settings.emergencyMessage || '');
          setSettingsId(settings._id);
          console.log('Loaded settings with ID:', settings._id);
          setIsEditable(false);
        } else {
          // Si no hay datos en el backend, cargar desde AsyncStorage
          const savedName = await AsyncStorage.getItem('userName');
          const savedContact = await AsyncStorage.getItem('emergencyContact');
          const savedMessage = await AsyncStorage.getItem('emergencyMessage');
          if (savedName) setName(savedName);
          if (savedContact) setEmergencyContact(savedContact);
          if (savedMessage) setEmergencyMessage(savedMessage);
          setIsEditable(true);
        }
      } catch (error: any) {
        console.error('Error loading settings:', error.message || error);
        // Cargar desde AsyncStorage si falla el backend
        const savedName = await AsyncStorage.getItem('userName');
        const savedContact = await AsyncStorage.getItem('emergencyContact');
        const savedMessage = await AsyncStorage.getItem('emergencyMessage');
        if (savedName) setName(savedName);
        if (savedContact) setEmergencyContact(savedContact);
        if (savedMessage) setEmergencyMessage(savedMessage);
        setIsEditable(true);
      }
    };
    loadSettings();
  }, []);

  // Guardar o actualizar datos
  const saveSettings = async () => {
    try {
      const settings = { name, emergencyContact, emergencyMessage };

      let response;
      if (settingsId) {
        // Actualizar datos existentes
        response = await axios.put(`https://ble-app-back.onrender.com/settings/${settingsId}`, settings);
        console.log('Settings updated:', response.data);
      } else {
        // Crear nuevos datos
        response = await axios.post('https://ble-app-back.onrender.com/settings', settings);
        const newId = response.data._id;
        if (newId) {
          setSettingsId(newId);
          console.log('Settings created with ID:', newId);
        } else {
          console.warn('No _id returned from POST response');
        }
      }

      // Guardar en AsyncStorage como respaldo
      await AsyncStorage.setItem('userName', name);
      await AsyncStorage.setItem('emergencyContact', emergencyContact);
      await AsyncStorage.setItem('emergencyMessage', emergencyMessage);

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
    try {
      const response = await axios.get('https://ble-app-back.onrender.com/settings', { timeout: 5000 });
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

  return (
    <ThemedView style={styles.container}>
      {/* Header with Title */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Información Personal</ThemedText>
      </ThemedView>

      {/* Form Section */}
      <ThemedView style={styles.form}>
        {/* Your Name */}
        <ThemedText style={styles.label}>Ingrese su nombre</ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ingrese su nombre"
          placeholderTextColor="#888"
          editable={isEditable}
        />

        {/* Emergency Contact */}
        <ThemedText style={styles.label}>Ingrese el contacto de emergencia</ThemedText>
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
        <ThemedText style={styles.label}>Mensaje de emergencia</ThemedText>
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
});