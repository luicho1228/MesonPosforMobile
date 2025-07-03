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
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const ActiveOrdersScreen = ({ navigation }) => {
  const { API } = useAuth();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/active`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching active orders:', error);
      Alert.alert('Error', 'Failed to load active orders');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveOrders();
    setRefreshing(false);
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.order_type === filter);

  const getOrderAge = (createdAt) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'preparing': return '#3b82f6';
      case 'ready': return '#10b981';
      case 'delivered': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus });
      fetchActiveOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const cancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(`${API}/orders/${orderId}/cancel`, {
                reason: 'other',
                notes: 'Cancelled from active orders'
              });
              fetchActiveOrders();
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedOrders([]);
  };

  const toggleOrderSelection = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const cancelSelectedOrders = () => {
    if (selectedOrders.length === 0) return;

    Alert.alert(
      'Cancel Selected Orders',
      `Are you sure you want to cancel ${selectedOrders.length} order(s)?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const orderId of selectedOrders) {
                await axios.post(`${API}/orders/${orderId}/cancel`, {
                  reason: 'other',
                  notes: 'Bulk cancelled from active orders'
                });
              }
              setSelectedOrders([]);
              setSelectMode(false);
              fetchActiveOrders();
            } catch (error) {
              console.error('Error cancelling orders:', error);
              Alert.alert('Error', 'Failed to cancel selected orders');
            }
          }
        }
      ]
    );
  };

  const renderOrderCard = ({ item: order }) => {
    const isSelected = selectedOrders.includes(order.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          isSelected && styles.orderCardSelected
        ]}
        onPress={() => {
          if (selectMode) {
            toggleOrderSelection(order.id);
          } else {
            // Navigate to order details or edit
            navigation.navigate('NewOrder', { editingOrder: order });
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            setSelectedOrders([order.id]);
          }
        }}
      >
        {selectMode && (
          <View style={styles.selectCheckbox}>
            <Icon 
              name={isSelected ? 'check-box' : 'check-box-outline-blank'} 
              size={24} 
              color={isSelected ? '#2563eb' : '#6b7280'} 
            />
          </View>
        )}
        
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>#{order.order_number}</Text>
          <View style={styles.orderMeta}>
            <Text style={styles.orderAge}>{getOrderAge(order.created_at)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>
                {order.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.orderType}>
            {order.order_type.replace('_', ' ').toUpperCase()}
            {order.table_number && ` - Table ${order.table_number}`}
          </Text>
          {order.customer_name && (
            <Text style={styles.customerName}>{order.customer_name}</Text>
          )}
        </View>

        <View style={styles.orderItems}>
          {order.items.slice(0, 3).map((item, index) => (
            <Text key={index} style={styles.itemText}>
              {item.quantity}x {item.menu_item_name}
            </Text>
          ))}
          {order.items.length > 3 && (
            <Text style={styles.moreItems}>+{order.items.length - 3} more items</Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
          
          {!selectMode && (
            <View style={styles.actionButtons}>
              {order.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.prepareButton]}
                  onPress={() => updateOrderStatus(order.id, 'preparing')}
                >
                  <Text style={styles.actionButtonText}>Prepare</Text>
                </TouchableOpacity>
              )}
              
              {order.status === 'preparing' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.readyButton]}
                  onPress={() => updateOrderStatus(order.id, 'ready')}
                >
                  <Text style={styles.actionButtonText}>Ready</Text>
                </TouchableOpacity>
              )}
              
              {order.status === 'ready' && order.order_type === 'delivery' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deliveredButton]}
                  onPress={() => updateOrderStatus(order.id, 'delivered')}
                >
                  <Text style={styles.actionButtonText}>Delivered</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => cancelOrder(order.id)}
              >
                <Icon name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Orders</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={toggleSelectMode}
          >
            <Text style={styles.selectButtonText}>
              {selectMode ? 'Done' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { value: 'all', label: 'All' },
            { value: 'dine_in', label: 'Dine In' },
            { value: 'takeout', label: 'Takeout' },
            { value: 'delivery', label: 'Delivery' }
          ].map(filterOption => (
            <TouchableOpacity
              key={filterOption.value}
              style={[
                styles.filterButton,
                filter === filterOption.value && styles.filterButtonSelected
              ]}
              onPress={() => setFilter(filterOption.value)}
            >
              <Text style={[
                styles.filterText,
                filter === filterOption.value && styles.filterTextSelected
              ]}>
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bulk Actions */}
      {selectMode && selectedOrders.length > 0 && (
        <View style={styles.bulkActions}>
          <Text style={styles.selectedCount}>
            {selectedOrders.length} order(s) selected
          </Text>
          <TouchableOpacity
            style={styles.bulkCancelButton}
            onPress={cancelSelectedOrders}
          >
            <Text style={styles.bulkCancelText}>Cancel Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="receipt" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No active orders</Text>
          </View>
        }
      />
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
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  selectButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  filterContainer: {
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonSelected: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  filterTextSelected: {
    color: 'white',
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedCount: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  bulkCancelButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkCancelText: {
    color: 'white',
    fontWeight: '600',
  },
  ordersList: {
    padding: 20,
  },
  orderCard: {
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
  orderCardSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  selectCheckbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderAge: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
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
  orderInfo: {
    marginBottom: 8,
  },
  orderType: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  customerName: {
    fontSize: 14,
    color: '#1f2937',
    marginTop: 2,
  },
  orderItems: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  prepareButton: {
    backgroundColor: '#3b82f6',
  },
  readyButton: {
    backgroundColor: '#10b981',
  },
  deliveredButton: {
    backgroundColor: '#6b7280',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  },
});

export default ActiveOrdersScreen;