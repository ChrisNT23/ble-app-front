import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import TermsModal from '@/components/TermsModal';

// Example of aliasing imports if there are conflicts
// import { AndroidCheckBox as CheckBox1 } from 'library1';
// import { AndroidCheckBox as CheckBox2 } from 'library2';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const checkTermsAcceptance = async () => {
      try {
        const hasAcceptedTerms = await AsyncStorage.getItem('hasAcceptedTerms');
        if (hasAcceptedTerms !== 'true') {
          setShowTermsModal(true);
        }
      } catch (error) {
        console.error('Error al verificar aceptación de términos:', error);
        setShowTermsModal(true); // Mostrar modal en caso de error
      }
    };

    checkTermsAcceptance();
  }, []);

  const handleAcceptTerms = async () => {
    try {
      await AsyncStorage.setItem('hasAcceptedTerms', 'true');
      setShowTermsModal(false);
    } catch (error) {
      console.error('Error al guardar aceptación de términos:', error);
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="connect"
          options={{
            title: 'Conexión',
            tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Configuración',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
      </Tabs>
      <TermsModal visible={showTermsModal} onAccept={handleAcceptTerms} />
    </>
  );
}