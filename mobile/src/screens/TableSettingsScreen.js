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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const TableSettingsScreen = ({ navigation }) => {
  const { API } = useAuth();
  const [tables, setTables] = useState([]);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [tableForm, setTableForm] = useState({
    number: '',
    capacity: '4'
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data.sort((a, b) => a.number - b.number));
    } catch (error) {
      console.error('Error fetching tables:', error);
      Alert.alert('Error', 'Failed to load tables');
    }
  };

  const handleAddTable = async () => {
    if (!tableForm.number || !tableForm.capacity) {
      Alert.alert('Required Fields', 'Table number and capacity are required');
      return;
    }

    const tableNumber = parseInt(tableForm.number);
    const capacity = parseInt(tableForm.capacity);

    if (isNaN(tableNumber) || tableNumber <= 0) {
      Alert.alert('Invalid Input', 'Table number must be a positive number');
      return;
    }

    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Invalid Input', 'Capacity must be a positive number');
      return;
    }

    // Check for duplicate table numbers
    const existingTable = tables.find(table => 
      table.number === tableNumber && (!editingTable || table.id !== editingTable.id)
    );
    
    if (existingTable) {
      Alert.alert('Duplicate Table', `Table ${tableNumber} already exists`);
      return;
    }

    try {
      const tableData = {
        number: tableNumber,
        capacity: capacity,
        status: 'available'
      };

      if (editingTable) {
        await axios.put(`${API}/tables/${editingTable.id}`, tableData);
        Alert.alert('Success', 'Table updated successfully');
      } else {
        await axios.post(`${API}/tables`, tableData);
        Alert.alert('Success', 'Table added successfully');
      }

      setShowAddTableModal(false);
      setEditingTable(null);
      setTableForm({ number: '', capacity: '4' });
      fetchTables();
    } catch (error) {
      console.error('Error saving table:', error);
      Alert.alert('Error', 'Failed to save table');
    }
  };

  const handleEditTable = (table) => {
    setTableForm({
      number: table.number.toString(),
      capacity: table.capacity.toString()
    });
    setEditingTable(table);
    setShowAddTableModal(true);
  };

  const handleDeleteTable = (table) => {
    if (table.status === 'occupied') {
      Alert.alert('Cannot Delete', 'Cannot delete occupied table. Please clear the table first.');
      return;
    }

    Alert.alert(
      'Delete Table',
      `Are you sure you want to delete Table ${table.number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/tables/${table.id}`);
              Alert.alert('Success', 'Table deleted successfully');
              fetchTables();
            } catch (error) {
              console.error('Error deleting table:', error);
              Alert.alert('Error', 'Failed to delete table');
            }
          }
        }
      ]
    );
  };

  const generateBulkTables = () => {
    Alert.alert(
      'Bulk Add Tables',
      'How many tables would you like to add?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '10 Tables',
          onPress: () => createBulkTables(10)
        },
        {
          text: '20 Tables',
          onPress: () => createBulkTables(20)
        },
        {
          text: 'Custom',
          onPress: () => {
            Alert.prompt(
              'Custom Amount',
              'Enter number of tables to create:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Create',
                  onPress: (value) => {
                    const count = parseInt(value);
                    if (!isNaN(count) && count > 0) {
                      createBulkTables(count);
                    } else {
                      Alert.alert('Invalid Input', 'Please enter a valid number');
                    }
                  }
                }
              ],
              'plain-text',
              '5'
            );
          }
        }
      ]
    );
  };

  const createBulkTables = async (count) => {
    try {
      const existingNumbers = tables.map(table => table.number);
      const tablesToCreate = [];
      let currentNumber = 1;

      for (let i = 0; i < count; i++) {
        while (existingNumbers.includes(currentNumber)) {
          currentNumber++;
        }
        tablesToCreate.push({
          number: currentNumber,
          capacity: 4,
          status: 'available'
        });
        existingNumbers.push(currentNumber);
        currentNumber++;
      }

      for (const table of tablesToCreate) {
        await axios.post(`${API}/tables`, table);
      }

      Alert.alert('Success', `${count} tables created successfully`);
      fetchTables();
    } catch (error) {
      console.error('Error creating bulk tables:', error);
      Alert.alert('Error', 'Failed to create tables');
    }
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'occupied': return '#dc2626';
      case 'reserved': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderTableCard = ({ item: table }) => (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <View style={styles.tableInfo}>
          <Text style={styles.tableNumber}>Table {table.number}</Text>
          <Text style={styles.tableCapacity}>Capacity: {table.capacity}</Text>
        </View>
        <View style={styles.tableActions}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getTableStatusColor(table.status) }
          ]}>
            <Text style={styles.statusText}>{table.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.tableFooter}>
        <Text style={styles.tableId}>ID: {table.id.slice(-6)}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditTable(table)}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              table.status === 'occupied' && styles.disabledButton
            ]}
            onPress={() => handleDeleteTable(table)}
            disabled={table.status === 'occupied'}
          >
            <Icon 
              name="delete" 
              size={16} 
              color={table.status === 'occupied' ? '#9ca3af' : '#dc2626'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const availableTables = tables.filter(table => table.status === 'available');
  const occupiedTables = tables.filter(table => table.status === 'occupied');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Table Settings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddTableModal(true)}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tables.length}</Text>
          <Text style={styles.statLabel}>Total Tables</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{availableTables.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{occupiedTables.length}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={generateBulkTables}
        >
          <Icon name="table-restaurant" size={20} color="#2563eb" />
          <Text style={styles.quickActionText}>Bulk Add Tables</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={fetchTables}
        >
          <Icon name="refresh" size={20} color="#2563eb" />
          <Text style={styles.quickActionText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Tables List */}
      <FlatList
        data={tables}
        renderItem={renderTableCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.tablesList}
        numColumns={2}
        columnWrapperStyle={styles.tableRow}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="table-restaurant" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No tables configured</Text>
            <TouchableOpacity 
              style={styles.emptyAddButton} 
              onPress={() => setShowAddTableModal(true)}
            >
              <Text style={styles.emptyAddButtonText}>Add First Table</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Table Modal */}
      <Modal
        visible={showAddTableModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingTable ? 'Edit Table' : 'Add Table'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddTableModal(false);
              setEditingTable(null);
              setTableForm({ number: '', capacity: '4' });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Table Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={tableForm.number}
                  onChangeText={(text) => setTableForm({...tableForm, number: text})}
                  placeholder="Enter table number"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Capacity *</Text>
                <TextInput
                  style={styles.textInput}
                  value={tableForm.capacity}
                  onChangeText={(text) => setTableForm({...tableForm, capacity: text})}
                  placeholder="Enter capacity"
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddTable}>
                <Text style={styles.saveButtonText}>
                  {editingTable ? 'Update Table' : 'Add Table'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  tablesList: {
    padding: 20,
  },
  tableRow: {
    justifyContent: 'space-between',
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tableHeader: {
    marginBottom: 12,
  },
  tableInfo: {
    marginBottom: 8,
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  tableCapacity: {
    fontSize: 14,
    color: '#6b7280',
  },
  tableActions: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
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
  disabledButton: {
    backgroundColor: '#f3f4f6',
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

export default TableSettingsScreen;