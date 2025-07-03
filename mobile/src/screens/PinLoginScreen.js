import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const PinLoginScreen = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const addDigit = (digit) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const removeDigit = () => {
    setPin(pin.slice(0, -1));
  };

  const clearPin = () => {
    setPin('');
  };

  const handleLogin = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    try {
      const result = await login(pin);
      if (!result.success) {
        Alert.alert('Login Failed', result.error);
        clearPin();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      clearPin();
    } finally {
      setLoading(false);
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              { backgroundColor: index < pin.length ? '#2563eb' : '#e5e7eb' }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      ['Clear', 0, 'Delete']
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.numberButton,
                  item === 'Clear' || item === 'Delete' ? styles.actionButton : null
                ]}
                onPress={() => {
                  if (item === 'Clear') {
                    clearPin();
                  } else if (item === 'Delete') {
                    removeDigit();
                  } else {
                    addDigit(item.toString());
                  }
                }}
                disabled={loading}
              >
                <Text style={[
                  styles.numberText,
                  item === 'Clear' || item === 'Delete' ? styles.actionText : null
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>El Meson Restaurant</Text>
        <Text style={styles.subtitle}>POS System</Text>
      </View>

      {/* PIN Display */}
      <View style={styles.pinSection}>
        <Text style={styles.pinLabel}>Enter PIN</Text>
        {renderPinDots()}
      </View>

      {/* Number Pad */}
      {renderNumberPad()}

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        onPress={handleLogin}
        disabled={loading || pin.length !== 4}
      >
        <Text style={styles.loginText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

      {/* Demo Info */}
      <View style={styles.demoInfo}>
        <Text style={styles.demoText}>Demo PINs:</Text>
        <Text style={styles.demoText}>Manager: 1234</Text>
        <Text style={styles.demoText}>Cashier: 5678</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pinLabel: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 20,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  numberPad: {
    alignItems: 'center',
    marginBottom: 30,
  },
  numberRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  numberButton: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
  },
  numberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  actionText: {
    fontSize: 16,
    color: '#6b7280',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoInfo: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  demoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
});

export default PinLoginScreen;