import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, Easing } from 'react-native';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  visible,
  onClose,
  duration = 5000,
}) => {
  const translateY = new Animated.Value(-100);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        velocity: 3,
      }).start();

      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        styles[type],
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.content}>
        <MaterialIcons
          name={type === 'success' ? 'check-circle' : 'error'}
          size={24}
          color="#FFFFFF"
        />
        <Text style={styles.message}>{message}</Text>
      </View>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <MaterialIcons name="close" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  success: {
    backgroundColor: '#34C759',
  },
  error: {
    backgroundColor: '#FF3B30',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default Notification; 