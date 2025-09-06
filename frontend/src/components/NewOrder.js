import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePrinter } from '../PrinterContext';
import { PaymentModal, ItemRemovalModal } from './ModalComponents';
import TableMergeModal from './TableMergeModal';
import { parseBackendTimestamp, formatLocalDate, formatLocalTime, formatLocalDateTime, getTimeElapsed, getOrderAgeColor } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper function to get table display name
const getTableDisplayName = (table) => {
  if (!table) return 'Unknown Table';
  
  if (table.name && table.name.trim()) {
    return table.name.trim();
  }
  
  return `Table ${table.number || table.id || 'Unknown'}`;
};

// New Order Component
const NewOrder = ({ selectedTable, editingOrder, editingActiveOrder, onBack, fromTableManagement = false }) => {
  const { printOrderReceipt, connected, openPrinterManager } = usePrinter();
  const [menuItems, setMenuItems] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: ''
  });
  
  // Add party size for gratuity calculations
  const [partySize, setPartySize] = useState(1);
  
  // Tax & Charges state - needed for calculateTotal function
  const [taxRates, setTaxRates] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [gratuityRules, setGratuityRules] = useState([]);
  const [discountPolicies, setDiscountPolicies] = useState([]);

  const updateOrderTableAssignment = async (orderId, tableId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/table`, { table_id: tableId });
      alert('Table assigned successfully!');
    } catch (error) {
      console.error('Error assigning table to order:', error);
      alert('Failed to assign table to order');
    }
  };

  const cancelEmptyOrder = async () => {
    try {
      // Cancel the empty order using correct POST endpoint
      await axios.post(`${API}/orders/${emptyOrderData.id}/cancel`, {
        reason: 'empty_order',
        notes: 'Order cancelled because all items were removed'
      });
      
      alert('Order cancelled successfully');
      setShowEmptyOrderModal(false);
      setEmptyOrderData(null);
      
      // Navigate back to main screen or active orders
      if (onBack) {
        onBack();
      }
      
      // If editing from table management, also refresh tables
      if (editingOrder && fromTableManagement) {
        // Force refresh of table management when we go back
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error cancelling empty order:', error);
      alert(`Failed to cancel order: ${error.response?.data?.detail || error.message}`);
    }
  };

  const resetCustomerInfo = () => {
    setCustomerInfo({ name: '', phone: '', address: '', apartment: '' });
    setShowCustomerInfo(false);
  };

  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [orderType, setOrderType] = useState(fromTableManagement ? 'dine_in' : (selectedTable ? 'dine_in' : 'takeout'));
  const [tip, setTip] = useState(0);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalItemIndex, setRemovalItemIndex] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerSelectionModal, setShowCustomerSelectionModal] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [assignedTable, setAssignedTable] = useState(selectedTable || null);
  const [tables, setTables] = useState([]);
  const [showTableMergeModal, setShowTableMergeModal] = useState(false);
  const [occupiedTableToMerge, setOccupiedTableToMerge] = useState(null);
  const [existingTableOrder, setExistingTableOrder] = useState(null);
  const [showEmptyOrderModal, setShowEmptyOrderModal] = useState(false);
  const [emptyOrderData, setEmptyOrderData] = useState(null);
  const [appliedDiscountIds, setAppliedDiscountIds] = useState([]);
  const [showChargeManagementModal, setShowChargeManagementModal] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [availableServiceCharges, setAvailableServiceCharges] = useState([]);
  const [showTableAssignmentWarning, setShowTableAssignmentWarning] = useState(false);
  const [conflictingTable, setConflictingTable] = useState(null);

  // Auto-fill customer info when phone number is entered
  const handlePhoneChange = async (phone) => {
    setCustomerInfo(prev => ({ ...prev, phone }));
    
    // If phone number is complete (at least 10 digits), try to lookup customer
    if (phone.length >= 10) {
      await lookupCustomerByPhone(phone);
    }
  };

  // Auto-fill customer info when address is entered (at least 10 characters)
  const handleAddressChange = async (address) => {
    setCustomerInfo(prev => ({ ...prev, address }));
    
    // If address is substantial (at least 10 characters), try to lookup customer
    if (address.length >= 10) {
      await lookupCustomerByAddress(address);
    }
  };

  // Lookup customer by phone number
  const lookupCustomerByPhone = async (phone) => {
    try {
      const response = await axios.get(`${API}/customers/${phone}`);
      const customer = response.data;
      
      // Auto-fill name and address if found
      setCustomerInfo(prev => ({
        ...prev,
        name: customer.name || prev.name,
        address: customer.address || prev.address,
        apartment: customer.apartment || prev.apartment
      }));
      
      // Show customer info section since we found a customer
      setShowCustomerInfo(true);
    } catch (error) {
      // Customer not found, which is fine - just continue with manual entry
      console.log('Customer not found by phone, continuing with manual entry');
    }
  };

  // Lookup customer by address (search through all customers)
  const lookupCustomerByAddress = async (address) => {
    try {
      const response = await axios.get(`${API}/customers`);
      const customers = response.data;
      
      // Find customer with matching address (case insensitive partial match)
      const matchingCustomer = customers.find(customer => 
        customer.address && 
        customer.address.toLowerCase().includes(address.toLowerCase()) &&
        customer.address.length > 0
      );
      
      if (matchingCustomer) {
        // Auto-fill other fields if found
        setCustomerInfo(prev => ({
          ...prev,
          name: matchingCustomer.name || prev.name,
          phone: matchingCustomer.phone || prev.phone,
          apartment: matchingCustomer.apartment || prev.apartment
        }));
        
        // Show customer info section since we found a customer
        setShowCustomerInfo(true);
      }
    } catch (error) {
      console.log('Error looking up customer by address:', error);
    }
  };

  useEffect(() => {
    if (editingOrder) {
      loadExistingTableOrder();
    } else if (editingActiveOrder) {
      loadActiveOrder();
    }
    fetchMenuItems();
    fetchCategories();
    fetchModifierData();
    fetchTables();
    fetchTaxChargesData(); // Load tax and charges data for dynamic calculation
  }, [editingOrder, editingActiveOrder]);

  // Listen for tax and charges data changes from other components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'taxChargesDataChanged') {
        console.log('Tax and charges data changed, refreshing...');
        fetchTaxChargesData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Also listen for changes within the same window
  useEffect(() => {
    const checkForChanges = () => {
      const lastChange = localStorage.getItem('taxChargesDataChanged');
      const currentCheck = localStorage.getItem('lastTaxChargesCheck') || '0';
      
      if (lastChange && lastChange !== currentCheck) {
        console.log('Tax and charges data changed within same window, refreshing...');
        fetchTaxChargesData();
        localStorage.setItem('lastTaxChargesCheck', lastChange);
      }
    };

    const interval = setInterval(checkForChanges, 1000); // Check every second
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const loadExistingTableOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${editingOrder.current_order_id}`);
      const order = response.data;
      setCurrentOrder(order);
      setCart(order.items);
      setCustomerInfo({
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.customer_address,
        apartment: order.customer_apartment || '',
        city: order.customer_city || '',
        state: order.customer_state || '',
        zip_code: order.customer_zip_code || ''
      });
      setOrderType(order.order_type);
      
      // If order has a table assigned, set the assigned table state
      if (order.table_id) {
        const tableResponse = await axios.get(`${API}/tables`);
        const tables = tableResponse.data;
        const assignedTableData = tables.find(table => table.id === order.table_id);
        if (assignedTableData) {
          setAssignedTable(assignedTableData);
        }
      }
    } catch (error) {
      console.error('Error loading existing order:', error);
    }
  };

  const loadActiveOrder = async () => {
    const order = editingActiveOrder;
    
    setCurrentOrder(order);
    setCart(order.items);
    
    // Try to get complete customer information if order fields are incomplete
    let customerInfoData = {
      name: order.customer_name,
      phone: order.customer_phone,
      address: order.customer_address,
      apartment: order.customer_apartment || '',
      city: order.customer_city || '',
      state: order.customer_state || '',
      zip_code: order.customer_zip_code || ''
    };
    
    // If customer ID exists but some fields are missing, try to fetch complete customer data
    if (order.customer_id && (!order.customer_apartment && !order.customer_city && !order.customer_state && !order.customer_zip_code)) {
      try {
        const customerResponse = await axios.get(`${API}/customers/${order.customer_id}`);
        const customerData = customerResponse.data;
        
        // Update customer info with complete data from customer record
        customerInfoData = {
          name: customerData.name || order.customer_name,
          phone: customerData.phone || order.customer_phone,
          address: customerData.address || order.customer_address,
          apartment: customerData.apartment || order.customer_apartment || '',
          city: customerData.city || order.customer_city || '',
          state: customerData.state || order.customer_state || '',
          zip_code: customerData.zip_code || order.customer_zip_code || ''
        };
      } catch (error) {
        // Continue with order data if customer lookup fails (customer may not exist)
        console.log('Customer record not found, using order data');
      }
    }
    
    setCustomerInfo(customerInfoData);
    setOrderType(order.order_type);
    
    // Set applied discount IDs
    setAppliedDiscountIds(order.applied_discount_ids || []);
    
    // Show customer info section if this is a delivery/takeout order with customer data
    if ((order.order_type === 'delivery' || order.order_type === 'takeout' || order.order_type === 'phone_order') && 
        (order.customer_name || order.customer_phone || order.customer_address)) {
      setShowCustomerInfo(true);
    }
    
    // If order has a table assigned (check both table_id and table_number)
    if (order.table_id || order.table_number) {
      try {
        const tableResponse = await axios.get(`${API}/tables`);
        const tables = tableResponse.data;
        
        // Try to find table by table_id first, then by table_number
        let assignedTableData = null;
        if (order.table_id) {
          assignedTableData = tables.find(table => table.id === order.table_id);
        }
        
        if (!assignedTableData && order.table_number) {
          assignedTableData = tables.find(table => table.number === order.table_number);
        }
        
        if (assignedTableData) {
          setAssignedTable(assignedTableData);
        }
      } catch (error) {
        console.error('Error loading assigned table:', error);
      }
    } else {
      // Clear assigned table if order has no table
      setAssignedTable(null);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu/items`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/menu/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchExistingCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setExistingCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setExistingCustomers([]);
    }
  };

  const handleSelectExistingCustomer = (customer) => {
    setCustomerInfo({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      apartment: customer.apartment || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || ''
    });
    setShowCustomerInfo(true);
    setShowCustomerSelectionModal(false);
    setCustomerSearchQuery('');
  };

  const fetchModifierData = async () => {
    try {
      const [groupsRes, modRes] = await Promise.all([
        axios.get(`${API}/modifiers/groups`),
        axios.get(`${API}/modifiers`)
      ]);
      setModifierGroups(groupsRes.data);
      setModifiers(modRes.data);
    } catch (error) {
      console.error('Error fetching modifier data:', error);
    }
  };

  const fetchTaxChargesData = async () => {
    try {
      // Fetch all tax and charges data from backend APIs
      const [taxRatesRes, serviceChargesRes, gratuityRulesRes, discountPoliciesRes] = await Promise.all([
        axios.get(`${API}/tax-charges/tax-rates`),
        axios.get(`${API}/tax-charges/service-charges`),
        axios.get(`${API}/tax-charges/gratuity-rules`),
        axios.get(`${API}/tax-charges/discount-policies`)
      ]);
      
      setTaxRates(taxRatesRes.data.length > 0 ? taxRatesRes.data : getDefaultTaxRates());
      setServiceCharges(serviceChargesRes.data.length > 0 ? serviceChargesRes.data : getDefaultServiceCharges());
      setGratuityRules(gratuityRulesRes.data.length > 0 ? gratuityRulesRes.data : getDefaultGratuityRules());
      setDiscountPolicies(discountPoliciesRes.data.length > 0 ? discountPoliciesRes.data : getDefaultDiscountPolicies());
      
    } catch (error) {
      console.error('Error fetching tax/charges data:', error);
      // Fallback to default data if API fails
      setTaxRates(getDefaultTaxRates());
      setServiceCharges(getDefaultServiceCharges());
      setGratuityRules(getDefaultGratuityRules());
      setDiscountPolicies(getDefaultDiscountPolicies());
      console.log('Using default tax and charges settings');
    }
  };

  const getDefaultTaxRates = () => [
    {
      id: crypto.randomUUID(),
      name: 'NYC Sales Tax',
      type: 'percentage',
      rate: 8.25,
      description: 'New York City Sales Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'city',
      tax_id: 'NYC-ST-001',
      active: true,
      inclusive: false
    },
    {
      id: crypto.randomUUID(),
      name: 'State Tax',
      type: 'percentage',
      rate: 4.0,
      description: 'New York State Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'state',
      tax_id: 'NYS-ST-001',
      active: true,
      inclusive: false
    }
  ];

  const getDefaultServiceCharges = () => [
    {
      id: crypto.randomUUID(),
      name: 'Large Party Service Charge',
      type: 'percentage',
      amount: 18,
      description: 'Automatic service charge for parties of 6 or more',
      applies_to: 'subtotal',
      conditions: ['party_size'],
      party_size_threshold: '6',
      order_types: ['dine_in'],
      active: true,
      mandatory: true
    },
    {
      id: crypto.randomUUID(),
      name: 'Delivery Fee',
      type: 'fixed',
      amount: 3.50,
      description: 'Standard delivery fee',
      applies_to: 'subtotal',
      conditions: ['order_type'],
      order_types: ['delivery'],
      active: true,
      mandatory: true
    }
  ];

  const getDefaultGratuityRules = () => [
    {
      id: crypto.randomUUID(),
      name: 'Automatic Gratuity - Large Parties',
      type: 'percentage',
      amount: 20,
      description: 'Automatic 20% gratuity for parties of 8+',
      trigger_condition: 'party_size',
      party_size_min: '8',
      applies_to_order_types: ['dine_in'],
      auto_apply: true,
      customer_can_modify: true,
      active: true
    },
    {
      id: crypto.randomUUID(),
      name: 'High-Value Order Gratuity',
      type: 'percentage',
      amount: 15,
      description: 'Suggested 15% gratuity for orders over $200',
      trigger_condition: 'order_amount',
      order_amount_min: '200',
      applies_to_order_types: ['dine_in', 'delivery'],
      auto_apply: false,
      customer_can_modify: true,
      active: true
    }
  ];

  const getDefaultDiscountPolicies = () => [
    {
      id: crypto.randomUUID(),
      name: 'Employee Discount',
      type: 'percentage',
      amount: 25,
      description: '25% discount for staff members',
      category: 'employee',
      conditions: ['requires_code'],
      discount_code: 'STAFF25',
      stackable: false,
      active: true,
      max_uses_per_day: '50'
    },
    {
      id: crypto.randomUUID(),
      name: 'Senior Citizen Discount',
      type: 'percentage',
      amount: 10,
      description: '10% discount for seniors (65+)',
      category: 'senior',
      conditions: ['time_based'],
      valid_days: ['monday', 'tuesday', 'wednesday', 'thursday'],
      valid_hours_start: '14:00',
      valid_hours_end: '17:00',
      stackable: true,
      active: true
    }
  ];

  const addToCart = (item) => {
    if (item.modifier_groups && item.modifier_groups.length > 0) {
      setSelectedMenuItem(item);
      setSelectedModifiers({});
      setShowModifierModal(true);
    } else {
      // Add item without modifiers
      const cartItem = {
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: 1,
        base_price: item.price,
        modifiers: [],
        total_price: item.price
      };
      
      const existingIndex = cart.findIndex(cartItem => 
        cartItem.menu_item_id === item.id && cartItem.modifiers.length === 0
      );
      
      if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += 1;
        newCart[existingIndex].total_price = newCart[existingIndex].base_price * newCart[existingIndex].quantity;
        setCart(newCart);
      } else {
        setCart([...cart, cartItem]);
      }
    }
  };

  const handleModifierSelection = () => {
    if (!selectedMenuItem) return;
    
    const selectedModifiersList = [];
    let modifierTotal = 0;
    
    Object.entries(selectedModifiers).forEach(([groupId, modifierIds]) => {
      modifierIds.forEach(modifierId => {
        const modifier = modifiers.find(m => m.id === modifierId);
        if (modifier) {
          selectedModifiersList.push({
            modifier_id: modifier.id,
            name: modifier.name,
            price: modifier.price
          });
          modifierTotal += modifier.price;
        }
      });
    });
    
    const cartItem = {
      menu_item_id: selectedMenuItem.id,
      menu_item_name: selectedMenuItem.name,
      quantity: 1,
      base_price: selectedMenuItem.price,
      modifiers: selectedModifiersList,
      total_price: selectedMenuItem.price + modifierTotal
    };
    
    setCart([...cart, cartItem]);
    setShowModifierModal(false);
    setSelectedMenuItem(null);
  };

  const updateCartItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      initiateItemRemoval(index);
      return;
    }
    
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    const modifierTotal = newCart[index].modifiers.reduce((sum, mod) => sum + mod.price, 0);
    newCart[index].total_price = (newCart[index].base_price + modifierTotal) * newQuantity;
    setCart(newCart);
  };

  const initiateItemRemoval = (index) => {
    setRemovalItemIndex(index);
    setShowRemovalModal(true);
  };

  const removeFromCart = async (removalData) => {
    if (currentOrder) {
      // Remove from existing order
      try {
        await axios.delete(`${API}/orders/${currentOrder.id}/items/${removalItemIndex}`, {
          data: removalData
        });
        
        // Reload the order properly based on source
        if (editingActiveOrder) {
          // Refresh from server for active order
          const response = await axios.get(`${API}/orders/${currentOrder.id}`);
          const updatedOrder = response.data;
          setCurrentOrder(updatedOrder);
          setCart(updatedOrder.items);
          
          // Check if order is now empty and show warning modal
          if (updatedOrder.items.length === 0) {
            setEmptyOrderData(updatedOrder);
            setShowEmptyOrderModal(true);
          }
        } else if (editingOrder) {
          // Reload existing table order and check if empty
          const response = await axios.get(`${API}/orders/${editingOrder.current_order_id}`);
          const updatedOrder = response.data;
          setCurrentOrder(updatedOrder);
          setCart(updatedOrder.items);
          
          // Check if order is now empty and show warning modal
          if (updatedOrder.items.length === 0) {
            setEmptyOrderData(updatedOrder);
            setShowEmptyOrderModal(true);
          }
        }
      } catch (error) {
        console.error('Error removing item from order:', error);
        alert('Failed to remove item from order');
      }
    } else {
      // Remove from cart
      const newCart = cart.filter((_, i) => i !== removalItemIndex);
      setCart(newCart);
    }
  };

  const calculateTotal = (currentAppliedDiscountIds = appliedDiscountIds) => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    
    // Filter taxes and service charges based on order type
    // Include items that either:
    // 1. Have empty applies_to_order_types/order_types array (apply to all order types)
    // 2. Have the current order_type in their applies_to_order_types/order_types array
    const activeTaxRates = taxRates.filter(tax => {
      if (!tax.active) return false;
      
      // If applies_to_order_types is empty or doesn't exist, apply to all order types
      if (!tax.applies_to_order_types || tax.applies_to_order_types.length === 0) {
        return true;
      }
      
      // Otherwise, check if current order type is included
      return tax.applies_to_order_types.includes(orderType);
    });
    
    const activeServiceCharges = serviceCharges.filter(charge => {
      if (!charge.active) return false;
      
      // If applies_to_order_types is empty or doesn't exist, apply to all order types
      if (!charge.applies_to_order_types || charge.applies_to_order_types.length === 0) {
        return true;
      }
      
      // Otherwise, check if current order type is included
      return charge.applies_to_order_types.includes(orderType);
    });
    
    const activeGratuityRules = gratuityRules.filter(gratuity => {
      if (!gratuity.active) return false;
      
      // If applies_to_order_types is empty or doesn't exist, apply to all order types
      if (!gratuity.applies_to_order_types || gratuity.applies_to_order_types.length === 0) {
        return true;
      }
      
      // Otherwise, check if current order type is included
      return gratuity.applies_to_order_types.includes(orderType);
    });
    
    const activeDiscountPolicies = discountPolicies.filter(discount => discount.active);
    
    // Calculate taxes
    let totalTaxes = 0;
    const taxBreakdown = [];
    for (const tax of activeTaxRates) {
      let taxAmount = 0;
      if (tax.type === 'percentage') {
        taxAmount = subtotal * (tax.rate / 100);
      } else if (tax.type === 'fixed') {
        taxAmount = tax.rate;
      }
      taxBreakdown.push({
        name: tax.name,
        type: 'tax',
        amount: taxAmount,
        rate: tax.rate,
        taxType: tax.type
      });
      totalTaxes += taxAmount;
    }

    // Calculate service charges with order cost conditions
    let totalServiceCharges = 0;
    const serviceChargeBreakdown = [];
    
    for (const charge of activeServiceCharges) {
      // Check if service charge applies to this order type
      if (charge.applies_to_order_types && charge.applies_to_order_types.length > 0 && 
          !charge.applies_to_order_types.includes(orderType)) {
        continue;
      }
      
      // Determine what amount to check against based on applies_to_subtotal field
      let checkAmount;
      if (charge.applies_to_subtotal === false) {
        // Apply conditions based on total cost (subtotal + tax)
        checkAmount = subtotal + totalTaxes;
      } else {
        // Apply conditions based on subtotal
        checkAmount = subtotal;
      }
      
      // Check minimum order requirement
      if (charge.minimum_order_amount && charge.minimum_order_amount > 0 && 
          checkAmount < charge.minimum_order_amount) {
        continue;
      }
      
      // Check maximum order requirement
      if (charge.maximum_order_amount && charge.maximum_order_amount > 0 && 
          checkAmount > charge.maximum_order_amount) {
        continue;
      }
      
      // If we get here, the charge applies
      let chargeAmount = 0;
      if (charge.type === 'percentage') {
        // Apply percentage to the appropriate base amount
        if (charge.applies_to_subtotal === false) {
          chargeAmount = (subtotal + totalTaxes) * (charge.amount / 100);
        } else {
          chargeAmount = subtotal * (charge.amount / 100);
        }
      } else if (charge.type === 'fixed') {
        chargeAmount = charge.amount;
      }
      
      serviceChargeBreakdown.push({
        name: charge.name,
        type: 'service_charge',
        amount: chargeAmount,
        rate: charge.amount,
        chargeType: charge.type
      });
      totalServiceCharges += chargeAmount;
    }

    // Calculate gratuity based on rules
    let totalGratuity = 0;
    const gratuityBreakdown = [];
    for (const gratuity of activeGratuityRules) {
      // Check minimum order amount
      if (gratuity.minimum_order_amount > 0 && subtotal < gratuity.minimum_order_amount) {
        continue;
      }
      
      // Check maximum order amount
      if (gratuity.maximum_order_amount > 0 && subtotal > gratuity.maximum_order_amount) {
        continue;
      }
      
      // Check party size
      if (gratuity.party_size_minimum > 0 && partySize < gratuity.party_size_minimum) {
        continue;
      }
      
      // Calculate gratuity amount
      let gratuityAmount = 0;
      if (gratuity.type === 'percentage') {
        gratuityAmount = subtotal * (gratuity.amount / 100);
      } else if (gratuity.type === 'fixed') {
        gratuityAmount = gratuity.amount;
      }
      
      gratuityBreakdown.push({
        name: gratuity.name,
        type: 'gratuity',
        amount: gratuityAmount,
        rate: gratuity.amount,
        gratuityType: gratuity.type,
        conditions: {
          minimum_order: gratuity.minimum_order_amount,
          maximum_order: gratuity.maximum_order_amount,
          party_size_min: gratuity.party_size_minimum
        }
      });
      totalGratuity += gratuityAmount;
    }

    // Calculate discounts from applied discount policies
    let totalDiscounts = 0;
    const discountBreakdown = [];
    
    if (currentAppliedDiscountIds && currentAppliedDiscountIds.length > 0) {
      for (const discountId of currentAppliedDiscountIds) {
        const discount = discountPolicies.find(d => d.id === discountId);
        if (discount && discount.active) {
          // Check if discount applies to this order
          let discountApplies = true;
          
          // Check minimum order requirement
          if (discount.minimum_order_amount > 0 && subtotal < discount.minimum_order_amount) {
            discountApplies = false;
          }
          
          // Check order type requirement
          if (discount.applies_to_order_types && discount.applies_to_order_types.length > 0 && 
              !discount.applies_to_order_types.includes(orderType)) {
            discountApplies = false;
          }
          
          if (discountApplies) {
            let discountAmount = 0;
            if (discount.type === 'percentage') {
              discountAmount = subtotal * (discount.amount / 100);
            } else {
              discountAmount = discount.amount;
            }
            
            totalDiscounts += discountAmount;
            discountBreakdown.push({
              name: discount.name,
              type: discount.type,
              rate: discount.amount,
              amount: discountAmount
            });
          }
        }
      }
    }

    return {
      subtotal,
      taxes: totalTaxes,
      serviceCharges: totalServiceCharges,
      gratuity: totalGratuity,
      discounts: totalDiscounts,
      total: subtotal + totalTaxes + totalServiceCharges + totalGratuity - totalDiscounts,
      breakdown: {
        taxes: taxBreakdown,
        serviceCharges: serviceChargeBreakdown,
        gratuity: gratuityBreakdown,
        discounts: discountBreakdown
      }
    };
  };

  const createOrUpdateOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to your order');
      return;
    }

    // Auto-create customer if they don't exist and we have customer info
    if (customerInfo.phone && customerInfo.name && !currentOrder) {
      try {
        const response = await axios.get(`${API}/customers/${customerInfo.phone}`);
        // Customer exists, we're good
      } catch (error) {
        if (error.response?.status === 404) {
          // Customer doesn't exist, create them
          try {
            const newCustomerData = {
              name: customerInfo.name,
              phone: customerInfo.phone,
              address: customerInfo.address || '',
              email: '',
              notes: `Auto-created from order on ${new Date().toLocaleDateString()}`
            };
            await axios.post(`${API}/customers`, newCustomerData);
            console.log('New customer auto-created successfully');
          } catch (createError) {
            console.error('Error auto-creating customer:', createError);
            // Continue with order creation even if customer creation fails
          }
        }
      }
    }

    try {
      const orderData = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        table_id: assignedTable?.id || selectedTable?.id || null,
        party_size: partySize,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          modifiers: item.modifiers,
          special_instructions: ''
        })),
        order_type: orderType,
        tip: 0,
        delivery_instructions: '',
        order_notes: orderNotes,
        applied_discount_ids: appliedDiscountIds
      };

      const response = await axios.post(`${API}/orders`, orderData);
      setCurrentOrder(response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order. Please try again.');
      return null;
    }
  };

  const sendToKitchen = async () => {
    let order = currentOrder;
    
    if (!order) {
      // Create new order
      order = await createOrUpdateOrder();
      if (!order) return;
      
      try {
        await axios.post(`${API}/orders/${order.id}/send`);
        alert('Order sent successfully!');
        onBack();
      } catch (error) {
        console.error('Error sending order:', error);
        alert(error.response?.data?.detail || 'Error sending order');
      }
    } else {
      // Update existing order
      try {
        await updateExistingOrder();
        alert('Order updated successfully!');
        onBack();
      } catch (error) {
        console.error('Error updating order:', error);
        alert(error.response?.data?.detail || 'Error updating order');
      }
    }
  };

  const updateExistingOrder = async () => {
    if (!currentOrder) return;

    try {
      const orderData = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        table_id: selectedTable?.id || currentOrder.table_id,
        party_size: partySize,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          modifiers: item.modifiers,
          special_instructions: ''
        })),
        order_type: orderType,
        tip: 0,
        delivery_instructions: '',
        order_notes: orderNotes,
        applied_discount_ids: appliedDiscountIds
      };

      // Update the existing order (keeps same order number)
      const response = await axios.put(`${API}/orders/${currentOrder.id}`, orderData);
      const updatedOrder = response.data;
      
      setCurrentOrder(updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const initiateCheckout = async () => {
    let order = currentOrder;
    
    if (!order) {
      order = await createOrUpdateOrder();
      if (!order) return;
    }

    setShowPaymentModal(true);
  };

  const printReceipt = async () => {
    if (!connected) {
      const shouldSetup = window.confirm('Printer not connected. Would you like to set up the printer now?');
      if (shouldSetup) {
        openPrinterManager();
      }
      return;
    }

    try {
      const totals = calculateTotal();
      const orderData = currentOrder || {
        ...totals,
        items: cart,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        order_type: orderType,
        table_number: assignedTable?.number || selectedTable?.number,
        created_at: new Date().toISOString(),
        order_number: `TEMP-${Date.now()}`
      };

      await printOrderReceipt(orderData);
    } catch (error) {
      console.error('Print receipt error:', error);
      alert('Failed to print receipt. Please check printer connection.');
    }
  };

  // Discount and charge management functions
  const fetchAvailableDiscounts = async () => {
    if (!currentOrder) return;
    
    try {
      const response = await axios.get(`${API}/orders/${currentOrder.id}/available-discounts`);
      setAvailableDiscounts(response.data);
    } catch (error) {
      console.error('Error fetching available discounts:', error);
    }
  };

  const fetchAvailableServiceCharges = async () => {
    if (!currentOrder) return;
    
    try {
      const response = await axios.get(`${API}/orders/${currentOrder.id}/available-service-charges`);
      setAvailableServiceCharges(response.data);
    } catch (error) {
      console.error('Error fetching available service charges:', error);
    }
  };

  const applyDiscountToOrder = async (discountId) => {
    try {
      const response = await axios.post(`${API}/orders/${currentOrder.id}/apply-discount`, {
        discount_id: discountId
      });
      
      // Update the current order with new totals
      setCurrentOrder(response.data);
      setAppliedDiscountIds(response.data.applied_discount_ids || []);
      
      // Refresh available discounts
      await fetchAvailableDiscounts();
      
      alert('Discount applied successfully!');
    } catch (error) {
      console.error('Error applying discount:', error);
      alert('Failed to apply discount: ' + (error.response?.data?.detail || error.message));
    }
  };

  const removeDiscountFromOrder = async (discountId) => {
    try {
      const response = await axios.post(`${API}/orders/${currentOrder.id}/remove-discount`, {
        discount_id: discountId
      });
      
      // Update the current order with new totals
      setCurrentOrder(response.data);
      setAppliedDiscountIds(response.data.applied_discount_ids || []);
      
      // Refresh available discounts
      await fetchAvailableDiscounts();
      
      alert('Discount removed successfully!');
    } catch (error) {
      console.error('Error removing discount:', error);
      alert('Failed to remove discount: ' + (error.response?.data?.detail || error.message));
    }
  };

  const openChargeManagement = async () => {
    await fetchAvailableDiscounts();
    await fetchAvailableServiceCharges();
    setShowChargeManagementModal(true);
  };


  const [orderTotals, setOrderTotals] = useState({
    subtotal: 0,
    taxes: 0,
    serviceCharges: 0,
    gratuity: 0,
    discounts: 0,
    total: 0,
    breakdown: {
      taxes: [],
      serviceCharges: [],
      gratuity: [],
      discounts: []
    }
  });

  // Update totals when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      console.log('🔍 DEBUG: Updating totals for cart:', cart);
      
      // Always calculate detailed breakdown dynamically to show specific tax names
      const totals = calculateTotal();
      console.log('🔍 DEBUG: Calculated totals with detailed breakdown:', totals);
      setOrderTotals(totals);
    } else {
      setOrderTotals({
        subtotal: 0,
        taxes: 0,
        serviceCharges: 0,
        gratuity: 0,
        discounts: 0,
        total: 0,
        breakdown: {
          taxes: [],
          serviceCharges: [],
          gratuity: [],
          discounts: []
        }
      });
    }
  }, [cart, currentOrder, editingActiveOrder, editingOrder, taxRates, serviceCharges, gratuityRules, discountPolicies, orderType]);

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const { subtotal, taxes, serviceCharges: serviceChargesTotal, gratuity, discounts, total, breakdown } = orderTotals;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold">
            {editingOrder ? `Edit ${getTableDisplayName(editingOrder)} Order` : 
             editingActiveOrder ? `Edit Order ${editingActiveOrder.order_number}` :
             selectedTable ? `New Order - ${getTableDisplayName(selectedTable)}` : 'New Order'}
          </h1>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">${total.toFixed(2)}</div>
            <div className="text-sm text-gray-600">{cart.length} items</div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Menu Items */}
        <div className="flex-1 p-6">
          {/* Order Type Selection */}
          {!fromTableManagement && (
            <div className="mb-6">
              <div className="flex space-x-2">
                {[
                  { value: 'dine_in', label: 'Dine In' },
                  { value: 'takeout', label: 'Takeout' },
                  { value: 'delivery', label: 'Delivery' }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setOrderType(type.value)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      orderType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Show order type indicator when from table management */}
          {fromTableManagement && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="text-blue-800 font-medium">Order Type: Dine In</span>
                <span className="text-blue-600 text-sm ml-2">(Table Management Mode)</span>
              </div>
            </div>
          )}

          {/* Table Selection for Dine In - Don't show when from table management */}
          {orderType === 'dine_in' && !fromTableManagement && (
            <div className="mb-6 bg-white rounded-xl p-4">
              <h3 className="font-bold text-lg mb-4">Selected Table</h3>
              
              {/* DEBUG INFO */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-gray-100 text-xs">
                  <div>DEBUG: assignedTable = {assignedTable ? JSON.stringify(assignedTable) : 'null'}</div>
                  <div>DEBUG: editingActiveOrder = {editingActiveOrder ? 'true' : 'false'}</div>
                  <div>DEBUG: currentOrder.table_id = {currentOrder?.table_id || 'undefined'}</div>
                  <div>DEBUG: currentOrder.table_number = {currentOrder?.table_number || 'undefined'}</div>
                </div>
              )}
              
              {assignedTable ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <span className="font-medium">{getTableDisplayName(assignedTable)}</span>
                    <span className="text-sm text-gray-600 ml-2">({assignedTable.status})</span>
                  </div>
                  {!fromTableManagement && !editingActiveOrder && (
                    <button
                      onClick={() => setShowTableModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Change Table
                    </button>
                  )}
                  {editingActiveOrder && (
                    <span className="text-sm text-green-600 font-medium">
                      (Assigned Table)
                    </span>
                  )}
                </div>
              ) : editingActiveOrder && currentOrder && currentOrder.table_id ? (
                // Active order already has table assigned
                <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3">
                  <span className="text-green-700 font-medium">
                    Table {currentOrder.table_number} (Already Assigned)
                  </span>
                </div>
              ) : !fromTableManagement ? (
                <div className="text-center">
                  <button
                    onClick={() => setShowTableModal(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-lg font-medium"
                  >
                    Choose Table
                  </button>
                </div>
              ) : (
                // When from table management, show loading or table info
                <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-blue-700 font-medium">
                    Table Management Mode - Loading...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Customer Info for Delivery */}
          {orderType === 'delivery' && (
            <div className="mb-6 bg-white rounded-xl p-4">
              {!showCustomerInfo ? (
                // Show customer selection options initially
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-4 text-gray-700">Customer Information</h3>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        fetchExistingCustomers();
                        setShowCustomerSelectionModal(true);
                      }}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-lg font-medium flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Select Existing Customer
                    </button>
                    <button
                      onClick={() => setShowCustomerModal(true)}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 text-lg font-medium flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add New Customer
                    </button>
                  </div>
                </div>
              ) : (
                // Show customer information section
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Customer Information</h3>
                    <button
                      onClick={() => setShowCustomerModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Edit Customer
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={customerInfo.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        placeholder="Number of people"
                        value={partySize}
                        onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={customerInfo.address}
                        onChange={(e) => handleAddressChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apartment/Unit</label>
                      <input
                        type="text"
                        placeholder="Apt, Suite, Unit"
                        value={customerInfo.apartment}
                        onChange={(e) => setCustomerInfo({...customerInfo, apartment: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={customerInfo.state}
                        onChange={(e) => setCustomerInfo({...customerInfo, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        placeholder="ZIP Code"
                        value={customerInfo.zip_code}
                        onChange={(e) => setCustomerInfo({...customerInfo, zip_code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-600">
                    ${item.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-96 bg-white shadow-lg p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h3>
          
          {/* Cart Items */}
          <div className="space-y-3 mb-6">
            {cart.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{item.menu_item_name}</h4>
                  <button
                    onClick={() => initiateItemRemoval(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ×
                  </button>
                </div>
                
                {item.modifiers.length > 0 && (
                  <div className="text-xs text-gray-600 mb-2">
                    {item.modifiers.map(mod => mod.name).join(', ')}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-medium">${item.total_price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-4 space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {/* Tax Breakdown */}
            {breakdown.taxes.map((tax, index) => (
              <div key={index} className="flex justify-between text-sm text-gray-600">
                <span>{tax.name} ({tax.taxType === 'percentage' ? `${tax.rate}%` : `$${tax.rate}`}):</span>
                <span>${tax.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {/* Service Charges Breakdown */}
            {breakdown.serviceCharges.map((charge, index) => (
              <div key={index} className="flex justify-between text-sm text-blue-600">
                <span>{charge.name} ({charge.chargeType === 'percentage' ? `${charge.rate}%` : `$${charge.rate}`}):</span>
                <span>${charge.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {/* Gratuity Breakdown */}
            {breakdown.gratuity.map((tip, index) => (
              <div key={index} className="flex justify-between text-sm text-green-600">
                <span>{tip.name} ({tip.gratuityType === 'percentage' ? `${tip.rate}%` : `$${tip.rate}`}):</span>
                <span>${tip.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {/* Discount Breakdown */}
            {breakdown.discounts.map((discount, index) => (
              <div key={index} className="flex justify-between text-sm text-red-600">
                <span>{discount.name} ({discount.type === 'percentage' ? `${discount.rate}%` : `$${discount.rate}`}):</span>
                <span>-${discount.amount.toFixed(2)}</span>
              </div>
            ))}
            
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Order Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Notes</label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Add special instructions or comments for this order..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">These notes will appear on the receipt</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Charge Management Button - only show when editing an existing order */}
            {(editingActiveOrder || editingOrder) && (
              <button
                onClick={openChargeManagement}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 font-semibold"
              >
                Manage Discounts & Charges
              </button>
            )}
            
            <button
              onClick={initiateCheckout}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 text-lg font-semibold"
            >
              Checkout
            </button>
            
            <button
              onClick={sendToKitchen}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Send
            </button>
            
            <button
              onClick={printReceipt}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 font-semibold"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModifierModal && selectedMenuItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Customize {selectedMenuItem.name}</h3>
            
            {selectedMenuItem.modifier_groups && selectedMenuItem.modifier_groups.length > 0 ? (
              selectedMenuItem.modifier_groups.map(groupId => {
                const group = modifierGroups.find(g => g.id === groupId);
                if (!group) return null;
                
                const groupModifiers = modifiers.filter(m => m.group_id === groupId);
                
                return (
                  <div key={groupId} className="mb-4">
                    <h4 className="font-medium mb-2">
                      {group.name} {group.required && <span className="text-red-500">*</span>}
                    </h4>
                    <div className="space-y-2">
                      {groupModifiers.map(modifier => (
                        <label key={modifier.id} className="flex items-center space-x-2">
                          <input
                            type={group.max_selections === 1 ? "radio" : "checkbox"}
                            name={`group-${groupId}`}
                            onChange={(e) => {
                              const newSelected = { ...selectedModifiers };
                              if (!newSelected[groupId]) newSelected[groupId] = [];
                              
                              if (group.max_selections === 1) {
                                newSelected[groupId] = e.target.checked ? [modifier.id] : [];
                              } else {
                                if (e.target.checked) {
                                  newSelected[groupId].push(modifier.id);
                                } else {
                                  newSelected[groupId] = newSelected[groupId].filter(id => id !== modifier.id);
                                }
                              }
                              setSelectedModifiers(newSelected);
                            }}
                          />
                          <span className="flex-1">{modifier.name}</span>
                          {modifier.price > 0 && (
                            <span className="text-green-600">+${modifier.price.toFixed(2)}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 mb-4">No modifiers available for this item.</p>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModifierModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleModifierSelection}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        order={currentOrder || { ...orderTotals, id: 'temp' }}
        onClose={() => setShowPaymentModal(false)}
        onPaymentComplete={() => {
          setShowPaymentModal(false);
          onBack();
        }}
      />

      <ItemRemovalModal
        isOpen={showRemovalModal}
        onClose={() => setShowRemovalModal(false)}
        onRemove={removeFromCart}
      />

      {/* Customer Modal */}
      {showCustomerModal && (
        <CustomerEditModal
          customer={{}}
          onSave={async (customerData) => {
            try {
              const response = await axios.post(`${API}/customers`, customerData);
              const newCustomer = response.data;
              
              // Auto-fill the customer info
              setCustomerInfo({
                name: newCustomer.name,
                phone: newCustomer.phone,
                address: newCustomer.address,
                apartment: newCustomer.apartment || '',
                city: newCustomer.city || '',
                state: newCustomer.state || '',
                zip_code: newCustomer.zip_code || ''
              });
              
              // Show customer info section
              setShowCustomerInfo(true);
              setShowCustomerModal(false);
            } catch (error) {
              console.error('Error creating customer:', error);
              alert('Failed to create customer');
            }
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {/* Customer Selection Modal */}
      {showCustomerSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Select Existing Customer</h2>
                <button
                  onClick={() => setShowCustomerSelectionModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search customers by name or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Customer List */}
              <div className="max-h-96 overflow-y-auto">
                {existingCustomers
                  .filter(customer => 
                    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    customer.phone.includes(customerSearchQuery)
                  )
                  .length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-gray-500">
                      {customerSearchQuery ? 'No customers found matching your search.' : 'No customers found.'}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {existingCustomers
                      .filter(customer => 
                        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                        customer.phone.includes(customerSearchQuery)
                      )
                      .map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => handleSelectExistingCustomer(customer)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{customer.name}</h3>
                              <p className="text-sm text-gray-600">{customer.phone}</p>
                              {customer.address && (
                                <p className="text-sm text-gray-500">
                                  {customer.apartment && `${customer.apartment} `}
                                  {customer.address}
                                  {customer.city && `, ${customer.city}`}
                                  {customer.state && `, ${customer.state}`}
                                  {customer.zip_code && ` ${customer.zip_code}`}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {customer.total_orders > 0 && (
                                <div className="text-xs text-gray-500">
                                  {customer.total_orders} orders • ${customer.total_spent?.toFixed(2) || '0.00'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setShowCustomerSelectionModal(false);
                    setShowCustomerModal(true);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Add New Customer
                </button>
                <button
                  onClick={() => setShowCustomerSelectionModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Table Selection Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Select Table</h3>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => {
                    if (table.status === 'occupied') {
                      // Show enhanced table assignment warning for occupied table
                      setConflictingTable(table);
                      setShowTableAssignmentWarning(true);
                    } else if (table.status === 'cleaning') {
                      // Show warning for cleaning table
                      alert(`${getTableDisplayName(table)} is currently being cleaned. Please select another table.`);
                    } else {
                      // Assign available table
                      setAssignedTable(table);
                      setShowTableModal(false);
                      
                      // If editing an active order, update the table assignment in database
                      if (editingActiveOrder && currentOrder) {
                        updateOrderTableAssignment(currentOrder.id, table.id);
                      }
                    }
                  }}
                  className={`p-4 rounded-lg border-2 text-center font-medium transition-colors ${
                    table.status === 'available' 
                      ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100' 
                      : table.status === 'occupied'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-100'
                      : 'border-red-500 bg-red-50 text-red-700 cursor-not-allowed'
                  }`}
                  disabled={false} // Remove the cleaning disabled state, handle it in onClick
                >
                  <div className="text-lg font-bold">{getTableDisplayName(table)}</div>
                  <div className="text-sm capitalize">{table.status}</div>
                  {table.status === 'occupied' && (
                    <div className="text-xs mt-1 bg-orange-200 px-2 py-1 rounded">⚠️ Occupied - Click for options</div>
                  )}
                  {table.status === 'cleaning' && (
                    <div className="text-xs mt-1 bg-red-200 px-2 py-1 rounded">🧹 Being cleaned</div>
                  )}
                  {table.status === 'available' && (
                    <div className="text-xs mt-1 bg-green-200 px-2 py-1 rounded">✅ Available</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table Merge Modal */}
      {showTableMergeModal && occupiedTableToMerge && (
        <TableMergeModal
          occupiedTable={occupiedTableToMerge}
          currentCart={cart}
          currentOrderInfo={{
            orderType,
            customerInfo,
            orderNotes,
            tip
          }}
          onConfirmMerge={async () => {
            try {
              // Close table selection modal first
              setShowTableModal(false);
              
              // Check if we have items in cart to merge
              if (cart.length === 0) {
                alert('No items in cart to merge');
                setShowTableMergeModal(false);
                return;
              }

              // First, create an order with current cart items
              const orderData = {
                customer_name: customerInfo.name,
                customer_phone: customerInfo.phone,
                customer_address: customerInfo.address,
                customer_apartment: customerInfo.apartment,
                customer_city: customerInfo.city,
                customer_state: customerInfo.state,
                customer_zip_code: customerInfo.zip_code,
                order_type: orderType,
                table_number: occupiedTableToMerge.number,
                items: cart.map(item => ({
                  menu_item_id: item.menu_item_id || item.id,
                  menu_item_name: item.menu_item_name || item.name,
                  quantity: item.quantity,
                  price: item.base_price || item.price,
                  modifiers: item.modifiers || item.selectedModifiers || []
                })),
                tip: tip,
                order_notes: orderNotes,
                status: 'pending'
              };

              // Calculate totals
              const subtotal = cart.reduce((sum, item) => sum + (item.total_price || item.price * item.quantity || 0), 0);
              orderData.subtotal = subtotal;

              // Create temporary order
              const tempOrderResponse = await axios.post(`${API}/orders`, orderData);
              const tempOrderId = tempOrderResponse.data.id;

              // Send to kitchen to get order ID that can be merged  
              await axios.put(`${API}/orders/${tempOrderId}/status`, { status: 'confirmed' });

              // Create a temporary table assignment for the new order
              // We need to assign this order to a temporary table so the merge API can work
              const tempTableResponse = await axios.post(`${API}/tables`, {
                number: 9999, // Temporary table number
                capacity: 1,
                status: 'occupied',
                current_order_id: tempOrderId
              });
              const tempTableId = tempTableResponse.data.id;

              // Now merge the temporary table with the occupied table
              await axios.post(`${API}/tables/${tempTableId}/merge`, {
                new_table_id: occupiedTableToMerge.id
              });

              // Clean up the temporary table
              await axios.delete(`${API}/tables/${tempTableId}`);

              alert(`Order successfully merged with ${getTableDisplayName(occupiedTableToMerge)}!`);
              
              // Clear cart and reset form
              setCart([]);
              setCustomerInfo({ name: '', phone: '', address: '', apartment: '' });
              setOrderNotes('');
              setTip(0);
              setAssignedTable(occupiedTableToMerge);
              setShowTableMergeModal(false);
              
            } catch (error) {
              console.error('Error merging orders:', error);
              alert(error.response?.data?.detail || 'Failed to merge orders');
            }
          }}
          onCancel={() => {
            setShowTableMergeModal(false);
            setOccupiedTableToMerge(null);
          }}
        />
      )}

      {/* Empty Order Warning Modal */}
      {showEmptyOrderModal && emptyOrderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <span className="text-yellow-600 text-2xl">⚠️</span>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Order is Now Empty
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                You've removed all items from Order #{emptyOrderData.order_number}. 
                What would you like to do with this empty order?
              </p>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={cancelEmptyOrder}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Cancel Order
                </button>
                
                <button
                  onClick={() => {
                    setShowEmptyOrderModal(false);
                    setEmptyOrderData(null);
                  }}
                  className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Keep Order (Add Items Later)
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-400">
                Order Info: {emptyOrderData.order_type === 'dine_in' ? getOrderTableDisplayName(emptyOrderData) : emptyOrderData.order_type}
                {emptyOrderData.customer_name && ` • ${emptyOrderData.customer_name}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charge Management Modal */}
      {showChargeManagementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Manage Order Discounts & Charges</h3>
              <button
                onClick={() => setShowChargeManagementModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Applied Discounts Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Applied Discounts</h4>
                <div className="space-y-2 mb-4">
                  {appliedDiscountIds.length > 0 ? (
                    appliedDiscountIds.map(discountId => {
                      const discount = discountPolicies.find(d => d.id === discountId);
                      return discount ? (
                        <div key={discountId} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-green-800">{discount.name}</div>
                              <div className="text-sm text-green-600">
                                {discount.type === 'percentage' ? `${discount.amount}%` : `$${discount.amount.toFixed(2)}`}
                                {discount.description && ` - ${discount.description}`}
                              </div>
                            </div>
                            <button
                              onClick={() => removeDiscountFromOrder(discountId)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">No discounts applied</p>
                  )}
                </div>

                <h4 className="text-lg font-semibold text-gray-800 mb-4">Available Discounts</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableDiscounts.length > 0 ? (
                    availableDiscounts.map(discount => (
                      <div key={discount.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-800">{discount.name}</div>
                            <div className="text-sm text-gray-600">
                              {discount.type === 'percentage' ? `${discount.amount}%` : `$${discount.amount.toFixed(2)}`}
                              {discount.description && ` - ${discount.description}`}
                            </div>
                          </div>
                          <button
                            onClick={() => applyDiscountToOrder(discount.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No available discounts for this order</p>
                  )}
                </div>
              </div>

              {/* Available Service Charges Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Available Service Charges</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableServiceCharges.length > 0 ? (
                    availableServiceCharges.map(charge => (
                      <div key={charge.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-blue-800">{charge.name}</div>
                            <div className="text-sm text-blue-600">
                              {charge.type === 'percentage' ? `${charge.amount}%` : `$${charge.amount.toFixed(2)}`}
                              {charge.description && ` - ${charge.description}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Applies to: {charge.applies_to_subtotal ? 'Subtotal' : 'Total with Tax'}
                            </div>
                          </div>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            Auto-Applied
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No additional service charges available</p>
                  )}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Service charges are automatically applied based on order conditions. 
                    Only non-mandatory service charges can be manually managed here. Taxes cannot be modified.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowChargeManagementModal(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Table Assignment Warning Modal */}
      {showTableAssignmentWarning && conflictingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-orange-600">⚠️ Table Assignment Conflict</h3>
              <button
                onClick={() => {
                  setShowTableAssignmentWarning(false);
                  setConflictingTable(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-800">
                      {getTableDisplayName(conflictingTable)} is Currently Occupied
                    </h4>
                    <p className="text-sm text-orange-600 mt-1">
                      This table has an active order. Choose how you'd like to proceed:
                    </p>
                  </div>
                </div>
              </div>

              {/* Current cart preview */}
              {cart.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Your Current Order:</h5>
                  <div className="space-y-1">
                    {cart.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.menu_item_name}</span>
                        <span>${(item.total_price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    {cart.length > 3 && (
                      <div className="text-xs text-gray-500">+{cart.length - 3} more items</div>
                    )}
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>${cart.reduce((sum, item) => sum + (item.total_price || 0), 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Option 1: Merge Orders */}
              <button
                onClick={() => {
                  setShowTableAssignmentWarning(false);
                  setOccupiedTableToMerge(conflictingTable);
                  setShowTableMergeModal(true);
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="font-semibold">Merge with Existing Order</div>
                    <div className="text-sm opacity-90">Add your items to the current table's order</div>
                  </div>
                </div>
              </button>

              {/* Option 2: Choose Different Table */}
              <button
                onClick={async () => {
                  setShowTableAssignmentWarning(false);
                  setConflictingTable(null);
                  // Keep table modal open to choose another table
                  
                  // Highlight available tables
                  const availableTables = tables.filter(t => t.status === 'available');
                  if (availableTables.length > 0) {
                    // Auto-suggest the next available table
                    const suggestedTable = availableTables[0];
                    if (window.confirm(`Would you like to use ${getTableDisplayName(suggestedTable)} instead? It's currently available.`)) {
                      setAssignedTable(suggestedTable);
                      setShowTableModal(false);
                      
                      if (editingActiveOrder && currentOrder) {
                        updateOrderTableAssignment(currentOrder.id, suggestedTable.id);
                      }
                    }
                  } else {
                    alert('No tables are currently available. You can merge with an existing order or wait for a table to become available.');
                  }
                }}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="font-semibold">Select Different Table</div>
                    <div className="text-sm opacity-90">Choose an available table instead</div>
                  </div>
                </div>
              </button>

              {/* Option 3: Force Assignment (Manager Override) */}
              <button
                onClick={() => {
                  const confirmed = window.confirm(
                    `⚠️ MANAGER OVERRIDE\n\n` +
                    `This will forcefully assign ${getTableDisplayName(conflictingTable)} to your new order. ` +
                    `The existing order will be moved to a temporary holding state.\n\n` +
                    `Only use this option if the table is actually empty or if you're resolving a data issue.\n\n` +
                    `Continue with manager override?`
                  );
                  
                  if (confirmed) {
                    setAssignedTable(conflictingTable);
                    setShowTableModal(false);
                    setShowTableAssignmentWarning(false);
                    setConflictingTable(null);
                    
                    // Optional: Log the override action
                    console.warn(`Manager override: Table ${getTableDisplayName(conflictingTable)} forcefully reassigned`);
                    
                    if (editingActiveOrder && currentOrder) {
                      updateOrderTableAssignment(currentOrder.id, conflictingTable.id);
                    }
                  }
                }}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">⚡</span>
                  <div>
                    <div className="font-semibold">Manager Override</div>
                    <div className="text-sm opacity-90">Force assign table (use with caution)</div>
                  </div>
                </div>
              </button>

              {/* Option 4: Cancel */}
              <button
                onClick={() => {
                  setShowTableAssignmentWarning(false);
                  setConflictingTable(null);
                }}
                className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel - Keep Current Selection
              </button>
            </div>

            {/* Info section */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>💡 Tip:</strong> The merge option is recommended when customers want to add items to an existing order. 
                Use "Select Different Table" for new customers who need their own separate check.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NewOrder;
