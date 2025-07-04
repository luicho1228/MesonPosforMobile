import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { usePrinter } from '../contexts/PrinterContext';
import axios from 'axios';

const DashboardScreen = ({ navigation }) => {
  const { user, logout, API } = useAuth();
  const { connected, openPrinterManager } = usePrinter();
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    availableTables: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [ordersRes, tablesRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/tables`)
      ]);

      const orderStats = ordersRes.data;
      const tables = tablesRes.data;
      const availableTables = tables.filter(t => t.status === 'available').length;

      setStats({
        todayOrders: orderStats.today_orders || 0,
        todayRevenue: orderStats.today_revenue || 0,
        activeOrders: orderStats.active_orders || 0,
        availableTables
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

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

  const quickActions = [
    {
      title: 'New Order',
      icon: 'add-shopping-cart',
      color: '#2563eb',
      onPress: () => navigation.navigate('NewOrder')
    },
    {
      title: 'Active Orders',
      icon: 'receipt',
      color: '#dc2626',
      onPress: () => navigation.navigate('Orders', { screen: 'ActiveOrders' })
    },
    {
      title: 'Tables',
      icon: 'table-restaurant',
      color: '#059669',
      onPress: () => navigation.navigate('Management', { screen: 'TableManagement' })
    },
    {
      title: 'Customers',
      icon: 'people',
      color: '#7c3aed',
      onPress: () => navigation.navigate('Management', { screen: 'CustomerManagement' })
    }
  ];

  const statCards = [
    {
      title: 'Today\'s Orders',
      value: stats.todayOrders,
      icon: 'receipt',
      color: '#2563eb'
    },
    {
      title: 'Today\'s Revenue',
      value: `$${stats.todayRevenue.toFixed(2)}`,
      icon: 'attach-money',
      color: '#059669'
    },
    {
      title: 'Active Orders',
      value: stats.activeOrders,
      icon: 'pending',
      color: '#dc2626'
    },
    {
      title: 'Available Tables',
      value: stats.availableTables,
      icon: 'table-restaurant',
      color: '#7c3aed'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>El Meson Restaurant</Text>
          <Text style={styles.subtitle}>POS Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.printerButton, connected ? styles.printerConnected : styles.printerDisconnected]}
            onPress={openPrinterManager}
          >
            <Icon name="print" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Message */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.full_name} ({user?.role})
          </Text>
          <Text style={styles.welcomeSubtext}>
            Ready to serve customers today!
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                <Icon name={stat.icon} size={24} color="white" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionCard, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <Icon name={action.icon} size={32} color={action.color} />
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  printerConnected: {
    backgroundColor: '#059669',
  },
  printerDisconnected: {
    backgroundColor: '#dc2626',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;