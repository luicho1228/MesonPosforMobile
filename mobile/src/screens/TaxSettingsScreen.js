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

const TaxSettingsScreen = ({ navigation }) => {
  const { API } = useAuth();
  const [activeTab, setActiveTab] = useState('taxes');
  const [taxRates, setTaxRates] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [gratuityRules, setGratuityRules] = useState([]);
  const [discountPolicies, setDiscountPolicies] = useState([]);
  const [showAddTaxModal, setShowAddTaxModal] = useState(false);
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [showAddGratuityModal, setShowAddGratuityModal] = useState(false);
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [editingCharge, setEditingCharge] = useState(null);
  const [editingGratuity, setEditingGratuity] = useState(null);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [taxForm, setTaxForm] = useState({
    name: '',
    rate: '',
    description: '',
    type: 'percentage',
    active: true
  });

  const [chargeForm, setChargeForm] = useState({
    name: '',
    amount: '',
    description: '',
    type: 'percentage',
    apply_to: 'subtotal',
    mandatory: false,
    active: true
  });

  const [gratuityForm, setGratuityForm] = useState({
    name: '',
    percentage: '',
    description: '',
    auto_apply: false,
    min_party_size: '',
    min_order_amount: '',
    customer_editable: true,
    active: true
  });

  const [discountForm, setDiscountForm] = useState({
    name: '',
    code: '',
    amount: '',
    description: '',
    type: 'percentage',
    min_order_amount: '',
    max_uses: '',
    expires_at: '',
    active: true
  });

  useEffect(() => {
    fetchTaxData();
  }, []);

  const fetchTaxData = async () => {
    try {
      setRefreshing(true);
      
      // Mock comprehensive data matching web app
      setTaxRates([
        {
          id: '1',
          name: 'NYC Sales Tax',
          rate: 8.25,
          description: 'New York City Sales Tax',
          type: 'percentage',
          active: true
        },
        {
          id: '2',
          name: 'State Tax',
          rate: 4.0,
          description: 'New York State Tax',
          type: 'percentage',
          active: true
        },
        {
          id: '3',
          name: 'Federal Tax',
          rate: 1.50,
          description: 'Federal Restaurant Tax',
          type: 'fixed',
          active: false
        }
      ]);

      setServiceCharges([
        {
          id: '1',
          name: 'Large Party Service Charge',
          amount: 18,
          description: 'Automatic 18% service charge for parties of 6 or more',
          type: 'percentage',
          apply_to: 'subtotal',
          mandatory: false,
          active: true
        },
        {
          id: '2',
          name: 'Delivery Fee',
          amount: 3.50,
          description: 'Standard delivery fee',
          type: 'fixed',
          apply_to: 'subtotal',
          mandatory: true,
          active: true
        },
        {
          id: '3',
          name: 'Processing Fee',
          amount: 2.5,
          description: 'Credit card processing fee',
          type: 'percentage',
          apply_to: 'total',
          mandatory: false,
          active: false
        }
      ]);

      setGratuityRules([
        {
          id: '1',
          name: 'Standard Gratuity',
          percentage: 18,
          description: 'Standard 18% gratuity suggestion',
          auto_apply: false,
          min_party_size: 1,
          min_order_amount: 0,
          customer_editable: true,
          active: true
        },
        {
          id: '2',
          name: 'Large Party Gratuity',
          percentage: 20,
          description: 'Automatic 20% gratuity for large parties',
          auto_apply: true,
          min_party_size: 8,
          min_order_amount: 100,
          customer_editable: false,
          active: true
        },
        {
          id: '3',
          name: 'Premium Service',
          percentage: 25,
          description: 'Premium service gratuity option',
          auto_apply: false,
          min_party_size: 1,
          min_order_amount: 200,
          customer_editable: true,
          active: false
        }
      ]);

      setDiscountPolicies([
        {
          id: '1',
          name: 'New Customer Discount',
          code: 'WELCOME10',
          amount: 10,
          description: '10% off for new customers',
          type: 'percentage',
          min_order_amount: 25,
          max_uses: 1,
          expires_at: '2024-12-31',
          active: true
        },
        {
          id: '2',
          name: 'Happy Hour',
          code: 'HAPPY15',
          amount: 15,
          description: '15% off during happy hour',
          type: 'percentage',
          min_order_amount: 20,
          max_uses: 0,
          expires_at: '',
          active: true
        },
        {
          id: '3',
          name: 'Free Delivery',
          code: 'FREEDEL',
          amount: 5.00,
          description: 'Free delivery on orders over $30',
          type: 'fixed',
          min_order_amount: 30,
          max_uses: 0,
          expires_at: '',
          active: false
        }
      ]);
    } catch (error) {
      console.error('Error fetching tax data:', error);
      Alert.alert('Error', 'Failed to load tax configuration');
    } finally {
      setRefreshing(false);
    }
  };

  // Tax Rate Functions
  const handleSaveTax = async () => {
    if (!taxForm.name || !taxForm.rate) {
      Alert.alert('Required Fields', 'Name and rate are required');
      return;
    }

    const rate = parseFloat(taxForm.rate);
    if (isNaN(rate) || rate < 0) {
      Alert.alert('Invalid Rate', 'Please enter a valid rate');
      return;
    }

    try {
      const taxData = {
        ...taxForm,
        rate: rate,
        id: editingTax ? editingTax.id : Date.now().toString()
      };

      if (editingTax) {
        setTaxRates(prev => prev.map(tax => tax.id === editingTax.id ? taxData : tax));
        Alert.alert('Success', 'Tax rate updated successfully');
      } else {
        setTaxRates(prev => [...prev, taxData]);
        Alert.alert('Success', 'Tax rate added successfully');
      }

      setShowAddTaxModal(false);
      setEditingTax(null);
      setTaxForm({
        name: '',
        rate: '',
        description: '',
        type: 'percentage',
        active: true
      });
    } catch (error) {
      console.error('Error saving tax rate:', error);
      Alert.alert('Error', 'Failed to save tax rate');
    }
  };

  const handleEditTax = (tax) => {
    setTaxForm({
      name: tax.name,
      rate: tax.rate.toString(),
      description: tax.description || '',
      type: tax.type,
      active: tax.active
    });
    setEditingTax(tax);
    setShowAddTaxModal(true);
  };

  const handleDeleteTax = (tax) => {
    Alert.alert(
      'Delete Tax Rate',
      `Are you sure you want to delete "${tax.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setTaxRates(prev => prev.filter(t => t.id !== tax.id));
              Alert.alert('Success', 'Tax rate deleted successfully');
            } catch (error) {
              console.error('Error deleting tax rate:', error);
              Alert.alert('Error', 'Failed to delete tax rate');
            }
          }
        }
      ]
    );
  };

  const toggleTaxStatus = async (tax) => {
    try {
      const updatedTax = { ...tax, active: !tax.active };
      setTaxRates(prev => prev.map(t => t.id === tax.id ? updatedTax : t));
    } catch (error) {
      console.error('Error updating tax status:', error);
      Alert.alert('Error', 'Failed to update tax status');
    }
  };

  // Service Charge Functions
  const handleSaveCharge = async () => {
    if (!chargeForm.name || !chargeForm.amount) {
      Alert.alert('Required Fields', 'Name and amount are required');
      return;
    }

    const amount = parseFloat(chargeForm.amount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      const chargeData = {
        ...chargeForm,
        amount: amount,
        id: editingCharge ? editingCharge.id : Date.now().toString()
      };

      if (editingCharge) {
        setServiceCharges(prev => prev.map(charge => charge.id === editingCharge.id ? chargeData : charge));
        Alert.alert('Success', 'Service charge updated successfully');
      } else {
        setServiceCharges(prev => [...prev, chargeData]);
        Alert.alert('Success', 'Service charge added successfully');
      }

      setShowAddChargeModal(false);
      setEditingCharge(null);
      setChargeForm({
        name: '',
        amount: '',
        description: '',
        type: 'percentage',
        apply_to: 'subtotal',
        mandatory: false,
        active: true
      });
    } catch (error) {
      console.error('Error saving service charge:', error);
      Alert.alert('Error', 'Failed to save service charge');
    }
  };

  const handleEditCharge = (charge) => {
    setChargeForm({
      name: charge.name,
      amount: charge.amount.toString(),
      description: charge.description || '',
      type: charge.type,
      apply_to: charge.apply_to,
      mandatory: charge.mandatory,
      active: charge.active
    });
    setEditingCharge(charge);
    setShowAddChargeModal(true);
  };

  const handleDeleteCharge = (charge) => {
    Alert.alert(
      'Delete Service Charge',
      `Are you sure you want to delete "${charge.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setServiceCharges(prev => prev.filter(c => c.id !== charge.id));
              Alert.alert('Success', 'Service charge deleted successfully');
            } catch (error) {
              console.error('Error deleting service charge:', error);
              Alert.alert('Error', 'Failed to delete service charge');
            }
          }
        }
      ]
    );
  };

  const toggleChargeStatus = async (charge) => {
    try {
      const updatedCharge = { ...charge, active: !charge.active };
      setServiceCharges(prev => prev.map(c => c.id === charge.id ? updatedCharge : c));
    } catch (error) {
      console.error('Error updating charge status:', error);
      Alert.alert('Error', 'Failed to update charge status');
    }
  };

  // Gratuity Functions
  const handleSaveGratuity = async () => {
    if (!gratuityForm.name || !gratuityForm.percentage) {
      Alert.alert('Required Fields', 'Name and percentage are required');
      return;
    }

    const percentage = parseFloat(gratuityForm.percentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      Alert.alert('Invalid Percentage', 'Please enter a valid percentage (0-100)');
      return;
    }

    try {
      const gratuityData = {
        ...gratuityForm,
        percentage: percentage,
        min_party_size: parseInt(gratuityForm.min_party_size) || 1,
        min_order_amount: parseFloat(gratuityForm.min_order_amount) || 0,
        id: editingGratuity ? editingGratuity.id : Date.now().toString()
      };

      if (editingGratuity) {
        setGratuityRules(prev => prev.map(rule => rule.id === editingGratuity.id ? gratuityData : rule));
        Alert.alert('Success', 'Gratuity rule updated successfully');
      } else {
        setGratuityRules(prev => [...prev, gratuityData]);
        Alert.alert('Success', 'Gratuity rule added successfully');
      }

      setShowAddGratuityModal(false);
      setEditingGratuity(null);
      setGratuityForm({
        name: '',
        percentage: '',
        description: '',
        auto_apply: false,
        min_party_size: '',
        min_order_amount: '',
        customer_editable: true,
        active: true
      });
    } catch (error) {
      console.error('Error saving gratuity rule:', error);
      Alert.alert('Error', 'Failed to save gratuity rule');
    }
  };

  const handleEditGratuity = (gratuity) => {
    setGratuityForm({
      name: gratuity.name,
      percentage: gratuity.percentage.toString(),
      description: gratuity.description || '',
      auto_apply: gratuity.auto_apply,
      min_party_size: gratuity.min_party_size.toString(),
      min_order_amount: gratuity.min_order_amount.toString(),
      customer_editable: gratuity.customer_editable,
      active: gratuity.active
    });
    setEditingGratuity(gratuity);
    setShowAddGratuityModal(true);
  };

  const handleDeleteGratuity = (gratuity) => {
    Alert.alert(
      'Delete Gratuity Rule',
      `Are you sure you want to delete "${gratuity.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setGratuityRules(prev => prev.filter(g => g.id !== gratuity.id));
              Alert.alert('Success', 'Gratuity rule deleted successfully');
            } catch (error) {
              console.error('Error deleting gratuity rule:', error);
              Alert.alert('Error', 'Failed to delete gratuity rule');
            }
          }
        }
      ]
    );
  };

  const toggleGratuityStatus = async (gratuity) => {
    try {
      const updatedGratuity = { ...gratuity, active: !gratuity.active };
      setGratuityRules(prev => prev.map(g => g.id === gratuity.id ? updatedGratuity : g));
    } catch (error) {
      console.error('Error updating gratuity status:', error);
      Alert.alert('Error', 'Failed to update gratuity status');
    }
  };

  // Discount Functions
  const handleSaveDiscount = async () => {
    if (!discountForm.name || !discountForm.amount) {
      Alert.alert('Required Fields', 'Name and amount are required');
      return;
    }

    const amount = parseFloat(discountForm.amount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      const discountData = {
        ...discountForm,
        amount: amount,
        min_order_amount: parseFloat(discountForm.min_order_amount) || 0,
        max_uses: parseInt(discountForm.max_uses) || 0,
        id: editingDiscount ? editingDiscount.id : Date.now().toString()
      };

      if (editingDiscount) {
        setDiscountPolicies(prev => prev.map(policy => policy.id === editingDiscount.id ? discountData : policy));
        Alert.alert('Success', 'Discount policy updated successfully');
      } else {
        setDiscountPolicies(prev => [...prev, discountData]);
        Alert.alert('Success', 'Discount policy added successfully');
      }

      setShowAddDiscountModal(false);
      setEditingDiscount(null);
      setDiscountForm({
        name: '',
        code: '',
        amount: '',
        description: '',
        type: 'percentage',
        min_order_amount: '',
        max_uses: '',
        expires_at: '',
        active: true
      });
    } catch (error) {
      console.error('Error saving discount policy:', error);
      Alert.alert('Error', 'Failed to save discount policy');
    }
  };

  const handleEditDiscount = (discount) => {
    setDiscountForm({
      name: discount.name,
      code: discount.code,
      amount: discount.amount.toString(),
      description: discount.description || '',
      type: discount.type,
      min_order_amount: discount.min_order_amount.toString(),
      max_uses: discount.max_uses.toString(),
      expires_at: discount.expires_at || '',
      active: discount.active
    });
    setEditingDiscount(discount);
    setShowAddDiscountModal(true);
  };

  const handleDeleteDiscount = (discount) => {
    Alert.alert(
      'Delete Discount Policy',
      `Are you sure you want to delete "${discount.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDiscountPolicies(prev => prev.filter(d => d.id !== discount.id));
              Alert.alert('Success', 'Discount policy deleted successfully');
            } catch (error) {
              console.error('Error deleting discount policy:', error);
              Alert.alert('Error', 'Failed to delete discount policy');
            }
          }
        }
      ]
    );
  };

  const toggleDiscountStatus = async (discount) => {
    try {
      const updatedDiscount = { ...discount, active: !discount.active };
      setDiscountPolicies(prev => prev.map(d => d.id === discount.id ? updatedDiscount : d));
    } catch (error) {
      console.error('Error updating discount status:', error);
      Alert.alert('Error', 'Failed to update discount status');
    }
  };

  // Render Functions
  const renderTaxCard = ({ item: tax }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{tax.name}</Text>
          <Text style={styles.cardSubtitle}>
            {tax.rate}{tax.type === 'percentage' ? '%' : '$'} 
            {tax.type === 'percentage' ? ' rate' : ' fixed'}
          </Text>
          {tax.description && (
            <Text style={styles.cardDescription}>{tax.description}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditTax(tax)}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteTax(tax)}
          >
            <Icon name="delete" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.statusToggle}
          onPress={() => toggleTaxStatus(tax)}
        >
          <View style={[
            styles.statusBadge,
            { backgroundColor: tax.active ? '#10b981' : '#6b7280' }
          ]}>
            <Text style={styles.statusText}>
              {tax.active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderChargeCard = ({ item: charge }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{charge.name}</Text>
            {charge.mandatory && (
              <View style={styles.mandatoryBadge}>
                <Text style={styles.mandatoryText}>MANDATORY</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSubtitle}>
            {charge.amount}{charge.type === 'percentage' ? '%' : '$'} 
            {charge.type === 'percentage' ? ' of ' + charge.apply_to : ' fixed charge'}
          </Text>
          {charge.description && (
            <Text style={styles.cardDescription}>{charge.description}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditCharge(charge)}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCharge(charge)}
          >
            <Icon name="delete" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.statusToggle}
          onPress={() => toggleChargeStatus(charge)}
        >
          <View style={[
            styles.statusBadge,
            { backgroundColor: charge.active ? '#10b981' : '#6b7280' }
          ]}>
            <Text style={styles.statusText}>
              {charge.active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGratuityCard = ({ item: gratuity }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{gratuity.name}</Text>
            {gratuity.auto_apply && (
              <View style={styles.autoBadge}>
                <Text style={styles.autoText}>AUTO</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSubtitle}>
            {gratuity.percentage}% gratuity
          </Text>
          {gratuity.description && (
            <Text style={styles.cardDescription}>{gratuity.description}</Text>
          )}
          {(gratuity.min_party_size > 1 || gratuity.min_order_amount > 0) && (
            <Text style={styles.cardConditions}>
              {gratuity.min_party_size > 1 && `Min party: ${gratuity.min_party_size}`}
              {gratuity.min_party_size > 1 && gratuity.min_order_amount > 0 && ', '}
              {gratuity.min_order_amount > 0 && `Min order: $${gratuity.min_order_amount}`}
            </Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditGratuity(gratuity)}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteGratuity(gratuity)}
          >
            <Icon name="delete" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.statusToggle}
          onPress={() => toggleGratuityStatus(gratuity)}
        >
          <View style={[
            styles.statusBadge,
            { backgroundColor: gratuity.active ? '#10b981' : '#6b7280' }
          ]}>
            <Text style={styles.statusText}>
              {gratuity.active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDiscountCard = ({ item: discount }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{discount.name}</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{discount.code}</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            {discount.amount}{discount.type === 'percentage' ? '%' : '$'} off
          </Text>
          {discount.description && (
            <Text style={styles.cardDescription}>{discount.description}</Text>
          )}
          <View style={styles.discountDetails}>
            {discount.min_order_amount > 0 && (
              <Text style={styles.cardConditions}>Min order: ${discount.min_order_amount}</Text>
            )}
            {discount.max_uses > 0 && (
              <Text style={styles.cardConditions}>Max uses: {discount.max_uses}</Text>
            )}
            {discount.expires_at && (
              <Text style={styles.cardConditions}>Expires: {discount.expires_at}</Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditDiscount(discount)}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteDiscount(discount)}
          >
            <Icon name="delete" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.statusToggle}
          onPress={() => toggleDiscountStatus(discount)}
        >
          <View style={[
            styles.statusBadge,
            { backgroundColor: discount.active ? '#10b981' : '#6b7280' }
          ]}>
            <Text style={styles.statusText}>
              {discount.active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const activeTaxes = taxRates.filter(tax => tax.active);
  const activeCharges = serviceCharges.filter(charge => charge.active);
  const activeGratuities = gratuityRules.filter(gratuity => gratuity.active);
  const activeDiscounts = discountPolicies.filter(discount => discount.active);
  const totalTaxRate = activeTaxes.reduce((sum, tax) => 
    sum + (tax.type === 'percentage' ? tax.rate : 0), 0
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tax & Charges</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            switch (activeTab) {
              case 'taxes':
                setShowAddTaxModal(true);
                break;
              case 'charges':
                setShowAddChargeModal(true);
                break;
              case 'gratuity':
                setShowAddGratuityModal(true);
                break;
              case 'discounts':
                setShowAddDiscountModal(true);
                break;
            }
          }}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeTaxes.length}</Text>
          <Text style={styles.statLabel}>Active Taxes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalTaxRate.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Total Tax Rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeCharges.length}</Text>
          <Text style={styles.statLabel}>Active Charges</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeDiscounts.length}</Text>
          <Text style={styles.statLabel}>Active Discounts</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'taxes', label: 'Taxes', icon: 'receipt' },
          { key: 'charges', label: 'Charges', icon: 'payment' },
          { key: 'gratuity', label: 'Gratuity', icon: 'star' },
          { key: 'discounts', label: 'Discounts', icon: 'local-offer' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon 
              name={tab.icon} 
              size={16} 
              color={activeTab === tab.key ? '#2563eb' : '#6b7280'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'taxes' && (
          <FlatList
            data={taxRates}
            renderItem={renderTaxCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="receipt" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No tax rates configured</Text>
              </View>
            }
          />
        )}

        {activeTab === 'charges' && (
          <FlatList
            data={serviceCharges}
            renderItem={renderChargeCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="payment" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No service charges configured</Text>
              </View>
            }
          />
        )}

        {activeTab === 'gratuity' && (
          <FlatList
            data={gratuityRules}
            renderItem={renderGratuityCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="star" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No gratuity rules configured</Text>
              </View>
            }
          />
        )}

        {activeTab === 'discounts' && (
          <FlatList
            data={discountPolicies}
            renderItem={renderDiscountCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="local-offer" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No discount policies configured</Text>
              </View>
            }
          />
        )}
      </ScrollView>

      {/* Add/Edit Tax Modal */}
      <Modal
        visible={showAddTaxModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingTax ? 'Edit Tax Rate' : 'Add Tax Rate'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddTaxModal(false);
              setEditingTax(null);
              setTaxForm({
                name: '',
                rate: '',
                description: '',
                type: 'percentage',
                active: true
              });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tax Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={taxForm.name}
                  onChangeText={(text) => setTaxForm({...taxForm, name: text})}
                  placeholder="e.g., Sales Tax, VAT"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tax Rate *</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.textInput, styles.flexInput]}
                    value={taxForm.rate}
                    onChangeText={(text) => setTaxForm({...taxForm, rate: text})}
                    placeholder="8.25"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>
                    {taxForm.type === 'percentage' ? '%' : '$'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      taxForm.type === 'percentage' && styles.typeButtonSelected
                    ]}
                    onPress={() => setTaxForm({...taxForm, type: 'percentage'})}
                  >
                    <Text style={[
                      styles.typeText,
                      taxForm.type === 'percentage' && styles.typeTextSelected
                    ]}>
                      Percentage
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      taxForm.type === 'fixed' && styles.typeButtonSelected
                    ]}
                    onPress={() => setTaxForm({...taxForm, type: 'fixed'})}
                  >
                    <Text style={[
                      styles.typeText,
                      taxForm.type === 'fixed' && styles.typeTextSelected
                    ]}>
                      Fixed Amount
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={taxForm.description}
                  onChangeText={(text) => setTaxForm({...taxForm, description: text})}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Active</Text>
                  <Switch
                    value={taxForm.active}
                    onValueChange={(value) => setTaxForm({...taxForm, active: value})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveTax}>
                <Text style={styles.saveButtonText}>
                  {editingTax ? 'Update Tax Rate' : 'Add Tax Rate'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add/Edit Service Charge Modal */}
      <Modal
        visible={showAddChargeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCharge ? 'Edit Service Charge' : 'Add Service Charge'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddChargeModal(false);
              setEditingCharge(null);
              setChargeForm({
                name: '',
                amount: '',
                description: '',
                type: 'percentage',
                apply_to: 'subtotal',
                mandatory: false,
                active: true
              });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Charge Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={chargeForm.name}
                  onChangeText={(text) => setChargeForm({...chargeForm, name: text})}
                  placeholder="e.g., Service Charge, Delivery Fee"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount *</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.textInput, styles.flexInput]}
                    value={chargeForm.amount}
                    onChangeText={(text) => setChargeForm({...chargeForm, amount: text})}
                    placeholder={chargeForm.type === 'percentage' ? '18' : '3.50'}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>
                    {chargeForm.type === 'percentage' ? '%' : '$'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      chargeForm.type === 'percentage' && styles.typeButtonSelected
                    ]}
                    onPress={() => setChargeForm({...chargeForm, type: 'percentage'})}
                  >
                    <Text style={[
                      styles.typeText,
                      chargeForm.type === 'percentage' && styles.typeTextSelected
                    ]}>
                      Percentage
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      chargeForm.type === 'fixed' && styles.typeButtonSelected
                    ]}
                    onPress={() => setChargeForm({...chargeForm, type: 'fixed'})}
                  >
                    <Text style={[
                      styles.typeText,
                      chargeForm.type === 'fixed' && styles.typeTextSelected
                    ]}>
                      Fixed Amount
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {chargeForm.type === 'percentage' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Apply To</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        chargeForm.apply_to === 'subtotal' && styles.typeButtonSelected
                      ]}
                      onPress={() => setChargeForm({...chargeForm, apply_to: 'subtotal'})}
                    >
                      <Text style={[
                        styles.typeText,
                        chargeForm.apply_to === 'subtotal' && styles.typeTextSelected
                      ]}>
                        Subtotal
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        chargeForm.apply_to === 'total' && styles.typeButtonSelected
                      ]}
                      onPress={() => setChargeForm({...chargeForm, apply_to: 'total'})}
                    >
                      <Text style={[
                        styles.typeText,
                        chargeForm.apply_to === 'total' && styles.typeTextSelected
                      ]}>
                        Total (with tax)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={chargeForm.description}
                  onChangeText={(text) => setChargeForm({...chargeForm, description: text})}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Mandatory</Text>
                  <Switch
                    value={chargeForm.mandatory}
                    onValueChange={(value) => setChargeForm({...chargeForm, mandatory: value})}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Active</Text>
                  <Switch
                    value={chargeForm.active}
                    onValueChange={(value) => setChargeForm({...chargeForm, active: value})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveCharge}>
                <Text style={styles.saveButtonText}>
                  {editingCharge ? 'Update Service Charge' : 'Add Service Charge'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add/Edit Gratuity Modal */}
      <Modal
        visible={showAddGratuityModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingGratuity ? 'Edit Gratuity Rule' : 'Add Gratuity Rule'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddGratuityModal(false);
              setEditingGratuity(null);
              setGratuityForm({
                name: '',
                percentage: '',
                description: '',
                auto_apply: false,
                min_party_size: '',
                min_order_amount: '',
                customer_editable: true,
                active: true
              });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Rule Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={gratuityForm.name}
                  onChangeText={(text) => setGratuityForm({...gratuityForm, name: text})}
                  placeholder="e.g., Standard Gratuity, Large Party"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gratuity Percentage *</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.textInput, styles.flexInput]}
                    value={gratuityForm.percentage}
                    onChangeText={(text) => setGratuityForm({...gratuityForm, percentage: text})}
                    placeholder="18"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>%</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Min Party Size</Text>
                <TextInput
                  style={styles.textInput}
                  value={gratuityForm.min_party_size}
                  onChangeText={(text) => setGratuityForm({...gratuityForm, min_party_size: text})}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Min Order Amount ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={gratuityForm.min_order_amount}
                  onChangeText={(text) => setGratuityForm({...gratuityForm, min_order_amount: text})}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={gratuityForm.description}
                  onChangeText={(text) => setGratuityForm({...gratuityForm, description: text})}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Auto Apply</Text>
                  <Switch
                    value={gratuityForm.auto_apply}
                    onValueChange={(value) => setGratuityForm({...gratuityForm, auto_apply: value})}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Customer Editable</Text>
                  <Switch
                    value={gratuityForm.customer_editable}
                    onValueChange={(value) => setGratuityForm({...gratuityForm, customer_editable: value})}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Active</Text>
                  <Switch
                    value={gratuityForm.active}
                    onValueChange={(value) => setGratuityForm({...gratuityForm, active: value})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGratuity}>
                <Text style={styles.saveButtonText}>
                  {editingGratuity ? 'Update Gratuity Rule' : 'Add Gratuity Rule'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add/Edit Discount Modal */}
      <Modal
        visible={showAddDiscountModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingDiscount ? 'Edit Discount Policy' : 'Add Discount Policy'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddDiscountModal(false);
              setEditingDiscount(null);
              setDiscountForm({
                name: '',
                code: '',
                amount: '',
                description: '',
                type: 'percentage',
                min_order_amount: '',
                max_uses: '',
                expires_at: '',
                active: true
              });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={discountForm.name}
                  onChangeText={(text) => setDiscountForm({...discountForm, name: text})}
                  placeholder="e.g., New Customer Discount"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={discountForm.code}
                  onChangeText={(text) => setDiscountForm({...discountForm, code: text.toUpperCase()})}
                  placeholder="e.g., WELCOME10"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Amount *</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.textInput, styles.flexInput]}
                    value={discountForm.amount}
                    onChangeText={(text) => setDiscountForm({...discountForm, amount: text})}
                    placeholder={discountForm.type === 'percentage' ? '10' : '5.00'}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>
                    {discountForm.type === 'percentage' ? '%' : '$'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      discountForm.type === 'percentage' && styles.typeButtonSelected
                    ]}
                    onPress={() => setDiscountForm({...discountForm, type: 'percentage'})}
                  >
                    <Text style={[
                      styles.typeText,
                      discountForm.type === 'percentage' && styles.typeTextSelected
                    ]}>
                      Percentage
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      discountForm.type === 'fixed' && styles.typeButtonSelected
                    ]}
                    onPress={() => setDiscountForm({...discountForm, type: 'fixed'})}
                  >
                    <Text style={[
                      styles.typeText,
                      discountForm.type === 'fixed' && styles.typeTextSelected
                    ]}>
                      Fixed Amount
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Min Order Amount ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={discountForm.min_order_amount}
                  onChangeText={(text) => setDiscountForm({...discountForm, min_order_amount: text})}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Max Uses (0 = unlimited)</Text>
                <TextInput
                  style={styles.textInput}
                  value={discountForm.max_uses}
                  onChangeText={(text) => setDiscountForm({...discountForm, max_uses: text})}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Expires At (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={discountForm.expires_at}
                  onChangeText={(text) => setDiscountForm({...discountForm, expires_at: text})}
                  placeholder="2024-12-31"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={discountForm.description}
                  onChangeText={(text) => setDiscountForm({...discountForm, description: text})}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Active</Text>
                  <Switch
                    value={discountForm.active}
                    onValueChange={(value) => setDiscountForm({...discountForm, active: value})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveDiscount}>
                <Text style={styles.saveButtonText}>
                  {editingDiscount ? 'Update Discount Policy' : 'Add Discount Policy'}
                </Text>
              </TouchableOpacity>
            </div>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#2563eb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardConditions: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  mandatoryBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mandatoryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  autoBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  codeBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  codeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  discountDetails: {
    marginTop: 4,
  },
  cardActions: {
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusToggle: {
    marginTop: 8,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
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
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
    marginRight: 12,
  },
  unitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeButtonSelected: {
    backgroundColor: '#2563eb',
  },
  typeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  typeTextSelected: {
    color: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
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

export default TaxSettingsScreen;