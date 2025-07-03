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
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { usePrinter } from '../contexts/PrinterContext';
import axios from 'axios';

const OrderHistoryScreen = ({ navigation }) => {
  const { API } = useAuth();
  const { printOrderReceipt } = usePrinter();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    fetchOrderHistory();
  }, [dateFilter]);

  const fetchOrderHistory = async () => {
    try {
      const params = dateFilter !== 'all' ? { date_filter: dateFilter } : {};
      const response = await axios.get(`${API}/orders/history`, { params });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching order history:', error);
      Alert.alert('Error', 'Failed to load order history');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderHistory();
    setRefreshing(false);
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US'),
      time: date.toLocaleTimeString('en-US', { hour12: true })
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'cancelled': return '#dc2626';
      case 'delivered': return '#6b7280';
      default: return '#f59e0b';
    }
  };

  const handlePrintOrder = async (order) => {
    try {
      const result = await printOrderReceipt(order);
      if (result.success) {
        Alert.alert('Success', 'Receipt printed successfully');
      } else {
        Alert.alert('Print Error', result.error || 'Failed to print receipt');
      }
    } catch (error) {
      Alert.alert('Print Error', 'Failed to print receipt');
    }
  };

  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const renderOrderCard = ({ item: order }) => {
    const { date, time } = formatDateTime(order.created_at);
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => showOrderDetails(order)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>#{order.order_number}</Text>
          <View style={styles.orderMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>
                {order.status.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => handlePrintOrder(order)}
            >
              <Icon name="print" size={16} color="#2563eb" />
            </TouchableOpacity>
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
          <Text style={styles.orderDateTime}>{date} at {time}</Text>
        </View>

        <View style={styles.orderItems}>
          {order.items.slice(0, 2).map((item, index) => (
            <Text key={index} style={styles.itemText}>
              {item.quantity}x {item.menu_item_name}
            </Text>
          ))}
          {order.items.length > 2 && (
            <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
          {order.payment_method && (
            <Text style={styles.paymentMethod}>
              {order.payment_method.toUpperCase()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const OrderDetailModal = () => {
    if (!selectedOrder) return null;

    const { date, time } = formatDateTime(selectedOrder.created_at);

    return (
      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order #{selectedOrder.order_number}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalPrintButton}
                onPress={() => handlePrintOrder(selectedOrder)}
              >
                <Icon name="print" size={20} color="white" />
                <Text style={styles.modalPrintText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowOrderModal(false)}
              >
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Order Details */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Order Details</Text>
              <Text style={styles.modalDetailText}>
                Type: {selectedOrder.order_type.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={styles.modalDetailText}>
                Status: {selectedOrder.status.toUpperCase()}
              </Text>
              <Text style={styles.modalDetailText}>Time: {date} at {time}</Text>
              {selectedOrder.table_number && (
                <Text style={styles.modalDetailText}>
                  Table: {selectedOrder.table_number}
                </Text>
              )}
            </View>

            {/* Customer Information */}
            {selectedOrder.customer_name && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer Information</Text>
                <Text style={styles.modalDetailText}>Name: {selectedOrder.customer_name}</Text>
                {selectedOrder.customer_phone && (
                  <Text style={styles.modalDetailText}>Phone: {selectedOrder.customer_phone}</Text>
                )}
                {selectedOrder.customer_address && (
                  <Text style={styles.modalDetailText}>Address: {selectedOrder.customer_address}</Text>
                )}
              </View>
            )}

            {/* Order Notes */}
            {selectedOrder.order_notes && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Order Notes</Text>
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{selectedOrder.order_notes}</Text>
                </View>
              </View>
            )}

            {/* Items */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Items</Text>
              {selectedOrder.items.map((item, index) => (
                <View key={index} style={styles.modalItem}>
                  <View style={styles.modalItemHeader}>
                    <Text style={styles.modalItemName}>
                      {item.quantity}x {item.menu_item_name}
                    </Text>
                    <Text style={styles.modalItemPrice}>
                      ${item.total_price.toFixed(2)}
                    </Text>
                  </View>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <View style={styles.modalModifiers}>
                      {item.modifiers.map((mod, modIndex) => (
                        <Text key={modIndex} style={styles.modalModifierText}>
                          + {mod.name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.modalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>${selectedOrder.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>${selectedOrder.tax.toFixed(2)}</Text>
              </View>
              {selectedOrder.tip > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tip:</Text>
                  <Text style={styles.totalValue}>${selectedOrder.tip.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total:</Text>
                <Text style={styles.grandTotalValue}>${selectedOrder.total.toFixed(2)}</Text>
              </View>

              {/* Payment Information */}
              {selectedOrder.payment_method && (
                <View style={styles.paymentInfo}>
                  <Text style={styles.modalSectionTitle}>Payment Information</Text>
                  <Text style={styles.modalDetailText}>
                    Method: {selectedOrder.payment_method.toUpperCase()}
                  </Text>
                  {selectedOrder.change_amount > 0 && (
                    <Text style={styles.modalDetailText}>
                      Change Given: ${selectedOrder.change_amount.toFixed(2)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
      </View>

      {/* Date Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { value: 'all', label: 'All Time' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' }
          ].map(filterOption => (
            <TouchableOpacity
              key={filterOption.value}
              style={[
                styles.filterButton,
                dateFilter === filterOption.value && styles.filterButtonSelected
              ]}
              onPress={() => setDateFilter(filterOption.value)}
            >
              <Text style={[
                styles.filterText,
                dateFilter === filterOption.value && styles.filterTextSelected
              ]}>
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="history" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No order history</Text>
          </View>
        }
      />

      {/* Order Detail Modal */}
      <OrderDetailModal />
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  printButton: {
    padding: 8,
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
  orderDateTime: {
    fontSize: 12,
    color: '#6b7280',
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
  paymentMethod: {
    fontSize: 12,
    color: '#6b7280',
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
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalPrintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  modalPrintText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
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
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
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
  modalItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  modalModifiers: {
    marginTop: 4,
    marginLeft: 16,
  },
  modalModifierText: {
    fontSize: 12,
    color: '#6b7280',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  paymentInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default OrderHistoryScreen;