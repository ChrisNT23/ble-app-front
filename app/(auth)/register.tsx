import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import TermsModal from '../../components/TermsModal';
import { API_URL } from '@/config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';

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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Colores adaptativos para modo claro/oscuro
  const colors = {
    background: isDark ? '#1C1C1E' : '#f5f5f5',
    cardBackground: isDark ? '#2C2C2E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#333333',
    textSecondary: isDark ? '#8E8E93' : '#666666',
    placeholder: isDark ? '#C7C7CC' : '#999999',
    inputBackground: isDark ? '#3A3A3C' : '#f8f8f8',
    inputBorder: isDark ? '#48484A' : '#ddd',
    error: '#FF3B30',
    success: '#34C759',
  };

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
    } catch (error: any) {
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Crear Cuenta</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ingresa tus datos para registrarte</Text>

      <View style={[styles.form, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Nombre"
            placeholderTextColor={colors.placeholder}
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Apellido"
            placeholderTextColor={colors.placeholder}
            value={apellido}
            onChangeText={setApellido}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Número de teléfono"
            placeholderTextColor={colors.placeholder}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Contraseña"
            placeholderTextColor={colors.placeholder}
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
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Confirmar Contraseña"
            placeholderTextColor={colors.placeholder}
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
          <Text style={[styles.loginText, { color: colors.textSecondary }]}>¿Ya tienes una cuenta? </Text>
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
        onClose={() => setShowTermsModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    borderRadius: 20,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
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
  },
  loginLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
}); 