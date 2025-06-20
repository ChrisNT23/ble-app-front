import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ visible, onAccept, onClose }) => {
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
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Términos y Condiciones</Text>
          <ScrollView 
            style={styles.termsContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.termsContent}
          >
            <Text style={styles.termsText}>
              Bienvenido a VERSION BETA. Al usar esta aplicación, aceptas los siguientes términos y condiciones:
            </Text>
            <Text style={styles.termsText}>
              1. Uso de la aplicación{'\n'}
              Esta app está diseñada para enviar mensajes de emergencia a un contacto predefinido usando Bluetooth y WhatsApp. No garantizamos que el mensaje siempre se envíe debido a factores externos (conexión, permisos, etc.).
            </Text>
            <Text style={styles.termsText}>
              2. Permisos{'\n'}
              La app requiere permisos de Bluetooth y ubicación para funcionar correctamente. Estos datos se usarán únicamente para enviar mensajes de emergencia.
            </Text>
            <Text style={styles.termsText}>
              3. Privacidad{'\n'}
              No almacenamos datos personales más allá de lo necesario para el funcionamiento de la app. Tu nombre, contacto de emergencia y mensaje se guardan localmente y en nuestro servidor seguro.
            </Text>
            <Text style={styles.termsText}>
              4. Responsabilidad{'\n'}
              No nos hacemos responsables por el mal uso de la app o fallos en el envío de mensajes debido a problemas técnicos o de red.
            </Text>
            <Text style={styles.termsText}>
              5. Actualizaciones{'\n'}
              Nos reservamos el derecho de actualizar estos términos en cualquier momento. Te notificaremos de cambios importantes.
            </Text>
            <Text style={styles.termsText}>
              Si tienes alguna duda, contáctanos en COLOCAR CONTACTO
            </Text>
          </ScrollView>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsChecked(!isChecked)}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>
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
    padding: Math.max(10, screenWidth * 0.025),
  },
  modalContainer: {
    width: '100%',
    maxWidth: Math.min(500, screenWidth * 0.95),
    maxHeight: Math.min(600, screenHeight * 0.85),
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: Math.max(15, screenWidth * 0.04),
    elevation: 5,
  },
  title: {
    fontSize: Math.max(18, screenWidth * 0.045),
    fontWeight: 'bold',
    marginBottom: Math.max(10, screenHeight * 0.015),
    textAlign: 'center',
    color: '#333',
  },
  termsContainer: {
    maxHeight: Math.min(300, screenHeight * 0.4),
    marginBottom: Math.max(10, screenHeight * 0.015),
  },
  termsContent: {
    paddingBottom: Math.max(5, screenHeight * 0.01),
  },
  termsText: {
    fontSize: Math.max(14, screenWidth * 0.035),
    color: '#666',
    lineHeight: Math.max(22, screenWidth * 0.055),
    marginBottom: Math.max(15, screenHeight * 0.02),
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: Math.max(10, screenHeight * 0.015),
    backgroundColor: '#FFFFFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Math.max(15, screenHeight * 0.02),
  },
  checkbox: {
    width: Math.max(18, screenWidth * 0.045),
    height: Math.max(18, screenWidth * 0.045),
    borderWidth: 2,
    borderColor: '#333',
    marginRight: Math.max(8, screenWidth * 0.02),
    borderRadius: 4,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  checkboxLabel: {
    fontSize: Math.max(12, screenWidth * 0.03),
    color: '#333',
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#34C759',
    paddingVertical: Math.max(10, screenHeight * 0.015),
    borderRadius: 8,
    alignItems: 'center',
    minHeight: Math.max(40, screenHeight * 0.05),
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: Math.max(14, screenWidth * 0.035),
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: Math.max(8, screenHeight * 0.01),
    right: Math.max(8, screenWidth * 0.02),
    zIndex: 1,
    padding: Math.max(4, screenWidth * 0.01),
  },
});

export default TermsModal;
