import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { usePrinter } from '../contexts/PrinterContext';
import axios from 'axios';

const NewOrderScreen = ({ navigation, route }) => {
  const { API } = useAuth();
  const { printOrderReceipt, connected, openPrinterManager } = usePrinter();
  
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('takeout');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [orderNotes, setOrderNotes] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);

  useEffect(() => {
    fetchMenuItems();
    fetchTables();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu`);
      setMenuItems(response.data);
      
      const uniqueCategories = [...new Set(response.data.map(item => item.category))];
      setCategories(['all', ...uniqueCategories]);
    } catch (error) {
      console.error('Error fetching menu:', error);
      Alert.alert('Error', 'Failed to load menu items');
    }
  };

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const filteredMenuItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    if (item.modifier_groups && item.modifier_groups.length > 0) {
      setSelectedMenuItem(item);
      setSelectedModifiers({});
      setShowModifierModal(true);
    } else {
      const cartItem = {
        id: Date.now(),
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: 1,
        base_price: item.price,
        modifiers: [],
        total_price: item.price
      };
      setCart([...cart, cartItem]);
    }
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + change);
        return {
          ...item,
          quantity: newQuantity,
          total_price: (item.base_price + item.modifiers.reduce((sum, mod) => sum + mod.price, 0)) * newQuantity
        };
      }
      return item;
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }

    if (orderType === 'delivery' && (!customerInfo.name || !customerInfo.phone || !customerInfo.address)) {
      Alert.alert('Customer Info Required', 'Please fill in customer information for delivery orders');
      setShowCustomerModal(true);
      return;
    }

    if (orderType === 'dine_in' && !selectedTable) {
      Alert.alert('Table Required', 'Please select a table for dine-in orders');
      setShowTableModal(true);
      return;
    }

    setShowPaymentModal(true);
  };

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => addToCart(item)}>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text style={styles.menuItemDescription}>{item.description}</Text>
        <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Icon name="add" size={24} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemContent}>
        <Text style={styles.cartItemName}>{item.menu_item_name}</Text>
        {item.modifiers.map((mod, index) => (
          <Text key={index} style={styles.modifierText}>+ {mod.name}</Text>
        ))}
        <Text style={styles.cartItemPrice}>${item.total_price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, -1)}
        >
          <Icon name="remove" size={16} color="white" />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, 1)}
        >
          <Icon name="add" size={16} color="white" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFromCart(item.id)}
      >
        <Icon name="delete" size={20} color="#dc2626" />
      </TouchableOpacity>
    </View>
  );

  const { subtotal, tax, total } = calculateTotal();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Order</Text>
        <TouchableOpacity
          style={[styles.printerButton, connected ? styles.printerConnected : styles.printerDisconnected]}
          onPress={openPrinterManager}
        >
          <Icon name="print" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Order Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Type</Text>
          <View style={styles.orderTypeContainer}>
            {[
              { value: 'dine_in', label: 'Dine In' },
              { value: 'takeout', label: 'Takeout' },
              { value: 'delivery', label: 'Delivery' }
            ].map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.orderTypeButton,
                  orderType === type.value && styles.orderTypeButtonSelected
                ]}
                onPress={() => setOrderType(type.value)}
              >
                <Text style={[
                  styles.orderTypeText,
                  orderType === type.value && styles.orderTypeTextSelected
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Table Selection for Dine In */}
        {orderType === 'dine_in' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Table</Text>
            <TouchableOpacity
              style={styles.tableSelector}
              onPress={() => setShowTableModal(true)}
            >
              <Text style={styles.tableSelectorText}>
                {selectedTable ? `Table ${selectedTable.number}` : 'Select Table'}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Customer Info for Delivery */}
        {orderType === 'delivery' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <TouchableOpacity
              style={styles.customerButton}
              onPress={() => setShowCustomerModal(true)}
            >
              <Text style={styles.customerButtonText}>
                {customerInfo.name ? customerInfo.name : 'Add Customer Info'}
              </Text>
              <Icon name="edit" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Category Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryContainer}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonSelected
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextSelected
                  ]}>
                    {category === 'all' ? 'All' : category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Items</Text>
          <FlatList
            data={filteredMenuItems}
            renderItem={renderMenuItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Cart */}
        {cart.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cart ({cart.length} items)</Text>
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
            
            {/* Order Notes */}
            <TextInput
              style={styles.notesInput}
              placeholder="Order notes (optional)"
              value={orderNotes}
              onChangeText={setOrderNotes}
              multiline
            />

            {/* Totals */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total:</Text>
                <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Checkout Button */}
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutButtonText}>Proceed to Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals would go here - CustomerModal, PaymentModal, TableModal, ModifierModal */}
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
  printerButton: {
    padding: 8,
    borderRadius: 8,
  },
  printerConnected: {
    backgroundColor: '#059669',
  },
  printerDisconnected: {
    backgroundColor: '#dc2626',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  orderTypeButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  orderTypeTextSelected: {
    color: 'white',
  },
  tableSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableSelectorText: {
    fontSize: 16,
    color: '#1f2937',
  },
  customerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  customerButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  categoryButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryText: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  categoryTextSelected: {
    color: 'white',
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cartItemContent: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modifierText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  quantityButton: {
    backgroundColor: '#6b7280',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
    color: '#1f2937',
  },
  removeButton: {
    padding: 8,
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  totalsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
  checkoutButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NewOrderScreen;