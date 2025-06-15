import { useCallback, useState } from 'react';

interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber: string;
  error: string | null;
}

export const usePhoneValidation = () => {
  const [isValid, setIsValid] = useState(false);
  const [formattedNumber, setFormattedNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validatePhone = useCallback((phone: string): PhoneValidationResult => {
    // Remove all non-digit characters except '+'
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Check if the number starts with '+'
    if (!cleaned.startsWith('+')) {
      setError('El número debe comenzar con el código de país (ej: +593)');
      setIsValid(false);
      return { isValid: false, formattedNumber: cleaned, error: 'El número debe comenzar con el código de país (ej: +593)' };
    }

    // Check if the number has at least 10 digits after the country code
    const digitsAfterPlus = cleaned.slice(1).replace(/\D/g, '');
    if (digitsAfterPlus.length < 10) {
      setError('El número debe tener al menos 10 dígitos después del código de país');
      setIsValid(false);
      return { isValid: false, formattedNumber: cleaned, error: 'El número debe tener al menos 10 dígitos después del código de país' };
    }

    // Validar que el número sea un número de WhatsApp válido
    // WhatsApp requiere que el número esté en formato internacional
    // y que sea un número móvil válido
    const countryCode = cleaned.slice(1, 4); // Obtener el código de país
    const validCountryCodes = ['593', '52', '54', '55', '56', '57', '58', '591', '595', '598']; // Códigos de países latinoamericanos comunes

    if (!validCountryCodes.includes(countryCode)) {
      setError('El código de país no es válido para WhatsApp');
      setIsValid(false);
      return { isValid: false, formattedNumber: cleaned, error: 'El código de país no es válido para WhatsApp' };
    }

    // Format the number with spaces for better readability
    const formatted = cleaned.replace(/(\+\d{2,3})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
    
    setError(null);
    setIsValid(true);
    setFormattedNumber(formatted);
    return { isValid: true, formattedNumber: formatted, error: null };
  }, []);

  return {
    isValid,
    formattedNumber,
    error,
    validatePhone,
  };
}; 