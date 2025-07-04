import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const StaffManagementScreen = ({ navigation }) => {
  const { API } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'cashier',
    pin: '',
    is_active: true,
    hourly_rate: '15.00'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API}/auth/users`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEmployee = async () => {
    if (!employeeForm.full_name || !employeeForm.email || !employeeForm.pin) {
      Alert.alert('Required Fields', 'Name, email, and PIN are required');
      return;
    }

    if (employeeForm.pin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }

    try {
      const employeeData = {
        ...employeeForm,
        hourly_rate: parseFloat(employeeForm.hourly_rate) || 15.00
      };

      if (editingEmployee) {
        await axios.put(`${API}/auth/users/${editingEmployee.id}`, employeeData);
        Alert.alert('Success', 'Employee updated successfully');
      } else {
        await axios.post(`${API}/auth/register`, employeeData);
        Alert.alert('Success', 'Employee added successfully');
      }

      setShowAddEmployeeModal(false);
      setEditingEmployee(null);
      setEmployeeForm({
        full_name: '',
        email: '',
        phone: '',
        role: 'cashier',
        pin: '',
        is_active: true,
        hourly_rate: '15.00'
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save employee');
    }
  };

  const handleEditEmployee = (employee) => {
    setEmployeeForm({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      pin: employee.pin,
      is_active: employee.is_active,
      hourly_rate: employee.hourly_rate?.toString() || '15.00'
    });
    setEditingEmployee(employee);
    setShowAddEmployeeModal(true);
  };

  const handleDeleteEmployee = (employee) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/employees/${employee.id}`);
              Alert.alert('Success', 'Employee deleted successfully');
              fetchEmployees();
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee');
            }
          }
        }
      ]
    );
  };

  const toggleEmployeeStatus = async (employee) => {
    try {
      await axios.put(`${API}/employees/${employee.id}`, {
        ...employee,
        is_active: !employee.is_active
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      Alert.alert('Error', 'Failed to update employee status');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'manager': return '#7c3aed';
      case 'cashier': return '#2563eb';
      case 'kitchen': return '#059669';
      case 'delivery': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'manager': return 'admin-panel-settings';
      case 'cashier': return 'point-of-sale';
      case 'kitchen': return 'restaurant';
      case 'delivery': return 'delivery-dining';
      default: return 'person';
    }
  };

  const renderEmployeeCard = ({ item: employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeNameRow}>
            <Text style={styles.employeeName}>{employee.full_name}</Text>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: employee.is_active ? '#10b981' : '#dc2626' }
            ]} />
          </View>
          <Text style={styles.employeeEmail}>{employee.email}</Text>
          {employee.phone && (
            <Text style={styles.employeePhone}>{employee.phone}</Text>
          )}
        </View>
        <View style={styles.employeeActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditEmployee(employee)}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteEmployee(employee)}
          >
            <Icon name="delete" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(employee.role) }]}>
          <Icon name={getRoleIcon(employee.role)} size={16} color="white" />
          <Text style={styles.roleText}>{employee.role.toUpperCase()}</Text>
        </View>
        
        <View style={styles.employeeStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PIN</Text>
            <Text style={styles.statValue}>••••</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>${employee.hourly_rate || 15}/hr</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <TouchableOpacity onPress={() => toggleEmployeeStatus(employee)}>
              <Text style={[
                styles.statValue,
                { color: employee.is_active ? '#10b981' : '#dc2626' }
              ]}>
                {employee.is_active ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const activeEmployees = employees.filter(emp => emp.is_active);
  const inactiveEmployees = employees.filter(emp => !emp.is_active);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddEmployeeModal(true)}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeEmployees.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{inactiveEmployees.length}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Employees List */}
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployeeCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.employeesList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="people" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No employees found' : 'No employees yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.emptyAddButton} 
                onPress={() => setShowAddEmployeeModal(true)}
              >
                <Text style={styles.emptyAddButtonText}>Add First Employee</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add/Edit Employee Modal */}
      <Modal
        visible={showAddEmployeeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingEmployee ? 'Edit Employee' : 'Add Employee'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddEmployeeModal(false);
              setEditingEmployee(null);
              setEmployeeForm({
                full_name: '',
                email: '',
                phone: '',
                role: 'cashier',
                pin: '',
                is_active: true,
                hourly_rate: '15.00'
              });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.full_name}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, full_name: text})}
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.email}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, email: text})}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.phone}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, phone: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role *</Text>
                <View style={styles.roleSelector}>
                  {['manager', 'cashier', 'kitchen', 'delivery'].map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        employeeForm.role === role && styles.roleButtonSelected
                      ]}
                      onPress={() => setEmployeeForm({...employeeForm, role})}
                    >
                      <Icon 
                        name={getRoleIcon(role)} 
                        size={20} 
                        color={employeeForm.role === role ? 'white' : '#6b7280'} 
                      />
                      <Text style={[
                        styles.roleButtonText,
                        employeeForm.role === role && styles.roleButtonTextSelected
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PIN (4 digits) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.pin}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, pin: text})}
                  placeholder="Enter 4-digit PIN"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hourly Rate ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.hourly_rate}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, hourly_rate: text})}
                  placeholder="15.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Active Employee</Text>
                  <Switch
                    value={employeeForm.is_active}
                    onValueChange={(value) => setEmployeeForm({...employeeForm, is_active: value})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddEmployee}>
                <Text style={styles.saveButtonText}>
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    fontSize: 18,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
  employeesList: {
    padding: 20,
  },
  employeeCard: {
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
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  employeeActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  employeeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
    justifyContent: 'center',
  },
  roleButtonSelected: {
    backgroundColor: '#2563eb',
  },
  roleButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  roleButtonTextSelected: {
    color: 'white',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

export default StaffManagementScreen;