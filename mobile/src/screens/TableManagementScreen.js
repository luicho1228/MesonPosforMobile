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
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const TableManagementScreen = ({ navigation }) => {
  const { API } = useAuth();
  const [tables, setTables] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSourceTable, setSelectedSourceTable] = useState(null);
  const [selectedDestTable, setSelectedDestTable] = useState(null);
  const [selectedTablesForCancel, setSelectedTablesForCancel] = useState([]);
  const [moveStep, setMoveStep] = useState('select-source');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
      Alert.alert('Error', 'Failed to load tables');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTables();
    setRefreshing(false);
  };

  const availableTables = tables.filter(table => table.status === 'available');
  const occupiedTables = tables.filter(table => table.status === 'occupied');

  const handleTablePress = (table) => {
    if (table.status === 'occupied') {
      // Navigate to edit existing order
      navigation.navigate('NewOrder', { 
        editingOrder: table,
        fromTableManagement: true
      });
    } else {
      // Navigate to create new order for available table
      navigation.navigate('NewOrder', { 
        selectedTable: table,
        fromTableManagement: true
      });
    }
  };

  const startMoveProcess = () => {
    if (occupiedTables.length === 0) {
      Alert.alert('No Occupied Tables', 'There are no occupied tables to move');
      return;
    }
    setMoveStep('select-source');
    setSelectedSourceTable(null);
    setSelectedDestTable(null);
    setShowMoveModal(true);
  };

  const selectSourceTable = (table) => {
    setSelectedSourceTable(table);
    setMoveStep('select-destination');
  };

  const selectDestinationTable = (table) => {
    setSelectedDestTable(table);
    
    if (table.status === 'occupied') {
      Alert.alert(
        'Table Occupied',
        `Table ${table.number} is occupied. Do you want to merge the orders?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge Orders', onPress: () => moveOrder(true) }
        ]
      );
    } else {
      moveOrder(false);
    }
  };

  const moveOrder = async (merge = false) => {
    try {
      const action = merge ? 'merge' : 'move';
      await axios.post(`${API}/tables/move`, {
        source_table_id: selectedSourceTable.id,
        dest_table_id: selectedDestTable.id,
        action
      });
      
      Alert.alert('Success', `Order ${action}d successfully`);
      setShowMoveModal(false);
      fetchTables();
    } catch (error) {
      console.error('Error moving order:', error);
      Alert.alert('Error', `Failed to ${merge ? 'merge' : 'move'} order`);
    }
  };

  const startCancelProcess = () => {
    if (occupiedTables.length === 0) {
      Alert.alert('No Occupied Tables', 'There are no occupied tables to cancel');
      return;
    }
    setSelectedTablesForCancel([]);
    setShowCancelModal(true);
  };

  const toggleTableForCancel = (tableId) => {
    if (selectedTablesForCancel.includes(tableId)) {
      setSelectedTablesForCancel(selectedTablesForCancel.filter(id => id !== tableId));
    } else {
      setSelectedTablesForCancel([...selectedTablesForCancel, tableId]);
    }
  };

  const cancelSelectedTables = async () => {
    if (selectedTablesForCancel.length === 0) return;

    Alert.alert(
      'Cancel Tables',
      `Are you sure you want to cancel ${selectedTablesForCancel.length} table(s)?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const tableId of selectedTablesForCancel) {
                const table = tables.find(t => t.id === tableId);
                if (table && table.current_order_id) {
                  await axios.post(`${API}/orders/${table.current_order_id}/cancel`, {
                    reason: 'other',
                    notes: `Table ${table.number} cancelled via table management`
                  });
                }
              }
              
              setShowCancelModal(false);
              setSelectedTablesForCancel([]);
              fetchTables();
              Alert.alert('Success', `${selectedTablesForCancel.length} table(s) cancelled successfully`);
            } catch (error) {
              console.error('Error cancelling tables:', error);
              Alert.alert('Error', 'Failed to cancel tables');
            }
          }
        }
      ]
    );
  };

  const getTableColor = (table) => {
    switch (table.status) {
      case 'available': return '#10b981';
      case 'occupied': return '#dc2626';
      case 'reserved': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderTable = (table) => (
    <TouchableOpacity
      key={table.id}
      style={[
        styles.tableCard,
        { borderLeftColor: getTableColor(table) }
      ]}
      onPress={() => handleTablePress(table)}
    >
      <View style={styles.tableHeader}>
        <Text style={styles.tableNumber}>Table {table.number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getTableColor(table) }]}>
          <Text style={styles.statusText}>{table.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.tableCapacity}>Capacity: {table.capacity}</Text>
      
      {table.status === 'occupied' && table.current_order_id && (
        <Text style={styles.orderInfo}>Order: {table.current_order_id.slice(-6)}</Text>
      )}
    </TouchableOpacity>
  );

  const MoveModal = () => (
    <Modal
      visible={showMoveModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {moveStep === 'select-source' ? 'Select Table to Move' : 'Select Destination'}
          </Text>
          <TouchableOpacity onPress={() => setShowMoveModal(false)}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {moveStep === 'select-source' && (
            <>
              <Text style={styles.modalInstructions}>
                Select the occupied table you want to move:
              </Text>
              <FlatList
                data={occupiedTables}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalTableCard}
                    onPress={() => selectSourceTable(item)}
                  >
                    <Text style={styles.modalTableNumber}>Table {item.number}</Text>
                    <Text style={styles.modalTableInfo}>Occupied</Text>
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
              />
            </>
          )}

          {moveStep === 'select-destination' && (
            <>
              <Text style={styles.modalInstructions}>
                Moving from Table {selectedSourceTable?.number}. Select destination:
              </Text>
              <FlatList
                data={tables.filter(t => t.id !== selectedSourceTable?.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalTableCard,
                      item.status === 'occupied' && styles.occupiedTableCard
                    ]}
                    onPress={() => selectDestinationTable(item)}
                  >
                    <Text style={styles.modalTableNumber}>Table {item.number}</Text>
                    <Text style={styles.modalTableInfo}>
                      {item.status.toUpperCase()}
                      {item.status === 'occupied' && ' (Will merge orders)'}
                    </Text>
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const CancelModal = () => (
    <Modal
      visible={showCancelModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Cancel Tables</Text>
          <TouchableOpacity onPress={() => setShowCancelModal(false)}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.modalInstructions}>
            Select occupied tables to cancel their orders:
          </Text>
          
          <FlatList
            data={occupiedTables}
            renderItem={({ item }) => {
              const isSelected = selectedTablesForCancel.includes(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.modalTableCard,
                    isSelected && styles.selectedTableCard
                  ]}
                  onPress={() => toggleTableForCancel(item.id)}
                >
                  <View style={styles.tableCardContent}>
                    <View>
                      <Text style={styles.modalTableNumber}>Table {item.number}</Text>
                      <Text style={styles.modalTableInfo}>Occupied</Text>
                    </View>
                    <Icon 
                      name={isSelected ? 'check-circle' : 'radio-button-unchecked'} 
                      size={24} 
                      color={isSelected ? '#2563eb' : '#d1d5db'} 
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => item.id}
          />

          {selectedTablesForCancel.length > 0 && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelSelectedTables}
            >
              <Text style={styles.cancelButtonText}>
                Cancel Selected ({selectedTablesForCancel.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Table Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={startMoveProcess}
          >
            <Icon name="swap-horiz" size={20} color="white" />
            <Text style={styles.actionButtonText}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelActionButton]}
            onPress={startCancelProcess}
          >
            <Icon name="cancel" size={20} color="white" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{availableTables.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{occupiedTables.length}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tables.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Tables Grid */}
      <ScrollView
        style={styles.tablesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.tablesGrid}>
          {tables.map(renderTable)}
        </View>
      </ScrollView>

      {/* Modals */}
      <MoveModal />
      <CancelModal />
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
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelActionButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
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
  tablesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tablesGrid: {
    paddingVertical: 16,
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
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
  tableCapacity: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  orderInfo: {
    fontSize: 12,
    color: '#374151',
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
    paddingTop: 16,
  },
  modalInstructions: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTableCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  occupiedTableCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  selectedTableCard: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  tableCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTableNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalTableInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TableManagementScreen;