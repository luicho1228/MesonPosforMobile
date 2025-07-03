import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { usePrinter } from '../contexts/PrinterContext';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { connected, status, openPrinterManager } = usePrinter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const settingsOptions = [
    {
      title: 'Printer Settings',
      subtitle: connected ? 'Printer Connected' : 'Setup Printer',
      icon: 'print',
      onPress: openPrinterManager,
      rightText: connected ? 'Connected' : 'Setup',
      rightColor: connected ? '#10b981' : '#f59e0b'
    },
    {
      title: 'User Profile',
      subtitle: `${user?.full_name} (${user?.role})`,
      icon: 'person',
      onPress: () => Alert.alert('Info', 'User profile editing coming soon'),
      rightText: '',
      rightColor: '#6b7280'
    },
    {
      title: 'App Version',
      subtitle: 'Restaurant POS Mobile v1.0.0',
      icon: 'info',
      onPress: () => Alert.alert('App Info', 'Restaurant POS Mobile\nVersion 1.0.0\nBuilt with React Native'),
      rightText: 'v1.0.0',
      rightColor: '#6b7280'
    },
    {
      title: 'About',
      subtitle: 'El Meson Restaurant POS System',
      icon: 'restaurant',
      onPress: () => Alert.alert(
        'About El Meson POS',
        'A comprehensive point-of-sale system for El Meson Restaurant.\n\n' +
        'Features:\n' +
        '• Order Management\n' +
        '• Table Management\n' +
        '• Customer Management\n' +
        '• Thermal Receipt Printing\n' +
        '• Real-time Order Tracking\n' +
        '• Sales Analytics'
      ),
      rightText: '',
      rightColor: '#6b7280'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Icon name="person" size={40} color="white" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name}</Text>
            <Text style={styles.userRole}>{user?.role}</Text>
            <Text style={styles.userStore}>El Meson Restaurant</Text>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Application Settings</Text>
          {settingsOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={option.onPress}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Icon name={option.icon} size={24} color="#2563eb" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{option.title}</Text>
                  <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                {option.rightText && (
                  <Text style={[styles.settingRightText, { color: option.rightColor }]}>
                    {option.rightText}
                  </Text>
                )}
                <Icon name="chevron-right" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* System Info */}
        <View style={styles.systemSection}>
          <Text style={styles.sectionTitle}>System Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Restaurant:</Text>
              <Text style={styles.infoValue}>El Meson Restaurant</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>3517 Broadway</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>929-321-9679</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>System:</Text>
              <Text style={styles.infoValue}>POS Mobile v1.0.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Printer Status:</Text>
              <Text style={[styles.infoValue, { color: connected ? '#10b981' : '#dc2626' }]}>
                {status}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Home', { screen: 'NewOrder' })}
          >
            <Icon name="add-shopping-cart" size={24} color="white" />
            <Text style={styles.actionButtonText}>New Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton]}
            onPress={() => navigation.navigate('Orders', { screen: 'ActiveOrders' })}
          >
            <Icon name="receipt" size={24} color="#2563eb" />
            <Text style={[styles.actionButtonText, styles.secondaryActionText]}>View Active Orders</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#dc2626" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 El Meson Restaurant POS System
          </Text>
          <Text style={styles.footerText}>
            All rights reserved
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 2,
  },
  userStore: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRightText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  systemSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryActionButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryActionText: {
    color: '#2563eb',
  },
  logoutSection: {
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default SettingsScreen;