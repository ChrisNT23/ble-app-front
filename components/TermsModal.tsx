import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ visible, onAccept }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleAccept = () => {
    if (isChecked) {
      onAccept();
    } else {
      alert('Por favor, acepta los términos y condiciones para continuar.');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Términos y Condiciones</Text>
          <ScrollView style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Bienvenido a EmergencyApp. Al usar esta aplicación, aceptas los siguientes términos y condiciones:

              1. **Uso de la aplicación**: Esta app está diseñada para enviar mensajes de emergencia a un contacto predefinido usando Bluetooth y SMS. No garantizamos que el mensaje siempre se envíe debido a factores externos (conexión, permisos, etc.).

              2. **Permisos**: La app requiere permisos de Bluetooth, SMS y ubicación para funcionar correctamente. Estos datos se usarán únicamente para enviar mensajes de emergencia.

              3. **Privacidad**: No almacenamos datos personales más allá de lo necesario para el funcionamiento de la app. Tu nombre, contacto de emergencia y mensaje se guardan localmente y en nuestro servidor seguro.

              4. **Responsabilidad**: No nos hacemos responsables por el mal uso de la app o fallos en el envío de mensajes debido a problemas técnicos o de red.

              5. **Actualizaciones**: Nos reservamos el derecho de actualizar estos términos en cualquier momento. Te notificaremos de cambios importantes.

              Si tienes alguna duda, contáctanos en COLOCAR CONTACTO
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsChecked(!isChecked)}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>Acepto los términos y condiciones</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, !isChecked && styles.disabledButton]}
            onPress={handleAccept}
            disabled={!isChecked}
          >
            <Text style={styles.acceptButtonText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  termsContainer: {
    flexGrow: 0,
    marginBottom: 15,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#333',
    marginRight: 10,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#34C759',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  acceptButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsModal;
