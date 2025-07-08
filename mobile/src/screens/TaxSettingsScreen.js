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
    type: 'percentage', // 'percentage' or 'fixed'
    active: true
  });

  const [chargeForm, setChargeForm] = useState({
    name: '',
    amount: '',
    description: '',
    type: 'percentage', // 'percentage' or 'fixed'
    apply_to: 'subtotal', // 'subtotal' or 'total'
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
    type: 'percentage', // 'percentage' or 'fixed'
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
      // For now, we'll use local state as the backend may not have these endpoints yet
      // In a real implementation, these would be API calls:
      // const [taxRes, chargeRes, gratuityRes, discountRes] = await Promise.all([
      //   axios.get(`${API}/tax-rates`),
      //   axios.get(`${API}/service-charges`),
      //   axios.get(`${API}/gratuity-rules`),
      //   axios.get(`${API}/discount-policies`)
      // ]);
      
      // Mock data for demonstration - matching web app structure
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
        // await axios.put(`${API}/tax-rates/${editingTax.id}`, taxData);
        setTaxRates(prev => prev.map(tax => tax.id === editingTax.id ? taxData : tax));
        Alert.alert('Success', 'Tax rate updated successfully');
      } else {
        // await axios.post(`${API}/tax-rates`, taxData);
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
        // await axios.put(`${API}/service-charges/${editingCharge.id}`, chargeData);
        setServiceCharges(prev => prev.map(charge => charge.id === editingCharge.id ? chargeData : charge));
        Alert.alert('Success', 'Service charge updated successfully');
      } else {
        // await axios.post(`${API}/service-charges`, chargeData);
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

  const toggleGratuityStatus = async (gratuity) => {
    try {
      const updatedGratuity = { ...gratuity, active: !gratuity.active };
      setGratuityRules(prev => prev.map(g => g.id === gratuity.id ? updatedGratuity : g));
    } catch (error) {
      console.error('Error updating gratuity status:', error);
      Alert.alert('Error', 'Failed to update gratuity status');
    }
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
        // await axios.put(`${API}/service-charges/${editingCharge.id}`, chargeData);
        setServiceCharges(prev => prev.map(charge => charge.id === editingCharge.id ? chargeData : charge));
        Alert.alert('Success', 'Service charge updated successfully');
      } else {
        // await axios.post(`${API}/service-charges`, chargeData);
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
              // await axios.delete(`${API}/tax-rates/${tax.id}`);
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
              // await axios.delete(`${API}/service-charges/${charge.id}`);
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

  const toggleTaxStatus = async (tax) => {
    try {
      const updatedTax = { ...tax, active: !tax.active };
      // await axios.put(`${API}/tax-rates/${tax.id}`, updatedTax);
      setTaxRates(prev => prev.map(t => t.id === tax.id ? updatedTax : t));
    } catch (error) {
      console.error('Error updating tax status:', error);
      Alert.alert('Error', 'Failed to update tax status');
    }
  };

  const toggleChargeStatus = async (charge) => {
    try {
      const updatedCharge = { ...charge, active: !charge.active };
      // await axios.put(`${API}/service-charges/${charge.id}`, updatedCharge);
      setServiceCharges(prev => prev.map(c => c.id === charge.id ? updatedCharge : c));
    } catch (error) {
      console.error('Error updating charge status:', error);
      Alert.alert('Error', 'Failed to update charge status');
    }
  };

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

  const activeTaxes = taxRates.filter(tax => tax.active);
  const activeCharges = serviceCharges.filter(charge => charge.active);
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
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowAddChargeModal(true)}
          >
            <Icon name="add" size={20} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowAddTaxModal(true)}
          >
            <Icon name="receipt" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeTaxes.length}</Text>
          <Text style={styles.statLabel}>Active Taxes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalTaxRate.toFixed(2)}%</Text>
          <Text style={styles.statLabel}>Total Tax Rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeCharges.length}</Text>
          <Text style={styles.statLabel}>Active Charges</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Tax Rates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tax Rates</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddTaxModal(true)}
            >
              <Icon name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Tax</Text>
            </TouchableOpacity>
          </View>
          
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
        </View>

        {/* Service Charges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Charges</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddChargeModal(true)}
            >
              <Icon name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Charge</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={serviceCharges}
            renderItem={renderChargeCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="receipt-long" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No service charges configured</Text>
              </View>
            }
          />
        </View>
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
                    trackColor={{ false: '#767577', true: '#2563eb' }}
                    thumbColor={taxForm.active ? '#ffffff' : '#f4f3f4'}
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
                    trackColor={{ false: '#767577', true: '#dc2626' }}
                    thumbColor={chargeForm.mandatory ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Active</Text>
                  <Switch
                    value={chargeForm.active}
                    onValueChange={(value) => setChargeForm({...chargeForm, active: value})}
                    trackColor={{ false: '#767577', true: '#2563eb' }}
                    thumbColor={chargeForm.active ? '#ffffff' : '#f4f3f4'}
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
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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