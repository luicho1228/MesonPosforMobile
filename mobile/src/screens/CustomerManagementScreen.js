import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const CustomerManagementScreen = ({ navigation }) => {
  const { API } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    apartment: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    }
  };

  const filterCustomers = () => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const showCustomerDetails = async (customer) => {
    try {
      const response = await axios.get(`${API}/customers/${customer.id}`);
      setSelectedCustomer(response.data);
      setShowCustomerModal(true);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      Alert.alert('Error', 'Failed to load customer details');
    }
  };

  const handleAddCustomer = () => {
    setCustomerForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      apartment: '',
      notes: ''
    });
    setShowAddModal(true);
  };

  const saveCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      Alert.alert('Required Fields', 'Name and phone are required');
      return;
    }

    try {
      await axios.post(`${API}/customers`, customerForm);
      Alert.alert('Success', 'Customer added successfully');
      setShowAddModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', 'Failed to save customer');
    }
  };

  const formatLastOrderDate = (date) => {
    if (!date) return 'Never';
    const orderDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const renderCustomerCard = ({ item: customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => showCustomerDetails(customer)}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerPhone}>{customer.phone}</Text>
          {customer.email && (
            <Text style={styles.customerEmail}>{customer.email}</Text>
          )}
        </View>
        <Icon name="chevron-right" size={24} color="#6b7280" />
      </View>
      
      <View style={styles.customerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{customer.total_orders || 0}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>${(customer.total_amount_spent || 0).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Spent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{formatLastOrderDate(customer.last_order_date)}</Text>
          <Text style={styles.statLabel}>Last Order</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const CustomerDetailModal = () => {
    if (!selectedCustomer) return null;

    return (
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedCustomer.name}</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Contact Information */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Contact Information</Text>
              <View style={styles.infoRow}>
                <Icon name="phone" size={20} color="#6b7280" />
                <Text style={styles.infoText}>{selectedCustomer.phone}</Text>
              </View>
              {selectedCustomer.email && (
                <View style={styles.infoRow}>
                  <Icon name="email" size={20} color="#6b7280" />
                  <Text style={styles.infoText}>{selectedCustomer.email}</Text>
                </View>
              )}
              {selectedCustomer.address && (
                <View style={styles.infoRow}>
                  <Icon name="location-on" size={20} color="#6b7280" />
                  <Text style={styles.infoText}>
                    {selectedCustomer.address}
                    {selectedCustomer.apartment && `, ${selectedCustomer.apartment}`}
                  </Text>
                </View>
              )}
            </View>

            {/* Statistics */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardNumber}>{selectedCustomer.total_orders || 0}</Text>
                  <Text style={styles.statCardLabel}>Total Orders</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardNumber}>
                    ${(selectedCustomer.total_amount_spent || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.statCardLabel}>Total Spent</Text>
                </View>
              </View>
              <Text style={styles.lastOrderText}>
                Last Order: {formatLastOrderDate(selectedCustomer.last_order_date)}
              </Text>
            </View>

            {/* Notes */}
            {selectedCustomer.notes && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Notes</Text>
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{selectedCustomer.notes}</Text>
                </View>
              </View>
            )}

            {/* Order History */}
            {selectedCustomer.order_history && selectedCustomer.order_history.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Recent Orders</Text>
                {selectedCustomer.order_history.slice(0, 5).map((order, index) => (
                  <View key={index} style={styles.orderHistoryItem}>
                    <View style={styles.orderHistoryHeader}>
                      <Text style={styles.orderHistoryNumber}>#{order.order_number}</Text>
                      <Text style={styles.orderHistoryAmount}>${order.total.toFixed(2)}</Text>
                    </View>
                    <Text style={styles.orderHistoryDate}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const AddCustomerModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Customer</Text>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={customerForm.name}
                onChangeText={(text) => setCustomerForm({...customerForm, name: text})}
                placeholder="Customer name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone *</Text>
              <TextInput
                style={styles.textInput}
                value={customerForm.phone}
                onChangeText={(text) => setCustomerForm({...customerForm, phone: text})}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={customerForm.email}
                onChangeText={(text) => setCustomerForm({...customerForm, email: text})}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.textInput}
                value={customerForm.address}
                onChangeText={(text) => setCustomerForm({...customerForm, address: text})}
                placeholder="Street address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apartment/Unit</Text>
              <TextInput
                style={styles.textInput}
                value={customerForm.apartment}
                onChangeText={(text) => setCustomerForm({...customerForm, apartment: text})}
                placeholder="Apartment, unit, etc."
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={customerForm.notes}
                onChangeText={(text) => setCustomerForm({...customerForm, notes: text})}
                placeholder="Additional notes"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveCustomer}>
              <Text style={styles.saveButtonText}>Save Customer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customer Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCustomer}>
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.customersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="people" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddCustomer}>
                <Text style={styles.emptyAddButtonText}>Add First Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modals */}
      <CustomerDetailModal />
      <AddCustomerModal />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  customersList: {
    padding: 20,
  },
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  statCardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  lastOrderText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  notesContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  notesText: {
    fontSize: 14,
    color: '#92400e',
  },
  orderHistoryItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderHistoryNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  orderHistoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  orderHistoryDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // Form Styles
  form: {
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomerManagementScreen;