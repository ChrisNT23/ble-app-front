import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import TermsModal from '../../components/TermsModal';
import { API_URL } from '@/config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('+593');
  const [showPassword, setShowPassword] = useState(false);

  const handlePhoneChange = (text: string) => {
    // Si el usuario borra el +593, lo volvemos a agregar
    if (!text.startsWith('+593')) {
      setPhone('+593' + text.replace('+593', ''));
    } else {
      setPhone(text);
    }
  };

  const handleRegister = async () => {
    if (!acceptTerms) {
      Alert.alert('Error', 'Por favor acepta los términos y condiciones');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (!nombre || !apellido || !email || !password || !phone) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    // Validar que el número tenga al menos 10 dígitos después del +593
    if (phone.length < 13) {
      Alert.alert('Error', 'El número de teléfono debe tener al menos 10 dígitos');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        nombre,
        apellido,
        correo: email,
        password,
        phone
      };

      console.log('Enviando datos de registro:', userData);

      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Error en el registro');
      }

      if (data.success && data.data && data.data.token) {
        await AsyncStorage.setItem('token', data.data.token);
        Alert.alert('Éxito', 'Registro exitoso. Por favor inicie sesión.');
        router.replace('/login');
      } else {
        throw new Error('No se recibió el token en la respuesta');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert('Error', error.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTerms = () => {
    setAcceptTerms(true);
    setShowTermsModal(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>
      <Text style={styles.subtitle}>Ingresa tus datos para registrarte</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Apellido"
            value={apellido}
            onChangeText={setApellido}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Número de teléfono"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirmar Contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.termsButton} 
          onPress={() => setShowTermsModal(true)}
        >
          <Text style={styles.termsButtonText}>
            {acceptTerms ? '✓ Términos Aceptados' : 'Ver Términos y Condiciones'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.registerButton, 
            (!acceptTerms || loading) && styles.registerButtonDisabled
          ]} 
          onPress={handleRegister}
          disabled={!acceptTerms || loading}
        >
          <Text style={styles.registerButtonText}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <TermsModal
        visible={showTermsModal}
        onAccept={handleAcceptTerms}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputIcon: {
    padding: 15,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  termsButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    marginTop: 8,
  },
  termsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#666',
  },
  loginLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
}); 