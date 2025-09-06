/**
 * Order calculation utilities
 */

export const calculateOrderTotals = (cart, taxes, serviceCharges, gratuityRules, discountPolicies, orderType, partySize, appliedDiscountIds = []) => {
  if (!cart || cart.length === 0) {
    return {
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
    };
  }

  // Calculate subtotal
  const subtotal = cart.reduce((sum, item) => sum + (item.total_price || item.price * item.quantity), 0);

  // Calculate taxes
  let totalTaxes = 0;
  const taxBreakdown = [];
  
  const applicableTaxes = taxes.filter(tax => 
    tax.active && 
    (!tax.applies_to_order_types || tax.applies_to_order_types.length === 0 || 
     tax.applies_to_order_types.includes(orderType))
  );

  for (const tax of applicableTaxes) {
    let taxAmount = 0;
    if (tax.type === 'percentage') {
      taxAmount = subtotal * (tax.rate / 100);
    } else if (tax.type === 'fixed') {
      taxAmount = tax.rate;
    }
    totalTaxes += taxAmount;
    taxBreakdown.push({
      name: tax.name,
      type: 'tax',
      amount: taxAmount,
      rate: tax.rate,
      taxType: tax.type
    });
  }

  // Calculate service charges with order cost conditions
  let totalServiceCharges = 0;
  const serviceChargeBreakdown = [];
  
  const applicableServiceCharges = serviceCharges.filter(charge => 
    charge.active && 
    (!charge.applies_to_order_types || charge.applies_to_order_types.length === 0 || 
     charge.applies_to_order_types.includes(orderType))
  );

  for (const charge of applicableServiceCharges) {
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
    
    totalServiceCharges += chargeAmount;
    serviceChargeBreakdown.push({
      name: charge.name,
      type: 'service_charge',
      amount: chargeAmount,
      rate: charge.amount,
      chargeType: charge.type
    });
  }

  // Calculate gratuity
  let totalGratuity = 0;
  const gratuityBreakdown = [];
  
  const applicableGratuity = gratuityRules.filter(rule => 
    rule.active && 
    (!rule.applies_to_order_types || rule.applies_to_order_types.length === 0 || 
     rule.applies_to_order_types.includes(orderType)) &&
    (!rule.minimum_order_amount || subtotal >= rule.minimum_order_amount) &&
    (!rule.maximum_order_amount || rule.maximum_order_amount === 0 || subtotal <= rule.maximum_order_amount) &&
    (!rule.party_size_minimum || partySize >= rule.party_size_minimum)
  );

  for (const rule of applicableGratuity) {
    let gratuityAmount = 0;
    if (rule.type === 'percentage') {
      gratuityAmount = subtotal * (rule.amount / 100);
    } else if (rule.type === 'fixed') {
      gratuityAmount = rule.amount;
    }
    totalGratuity += gratuityAmount;
    gratuityBreakdown.push({
      name: rule.name,
      type: 'gratuity',
      amount: gratuityAmount,
      rate: rule.amount,
      ruleType: rule.type
    });
  }

  // Calculate discounts from applied discount policies
  let totalDiscounts = 0;
  const discountBreakdown = [];
  
  if (appliedDiscountIds && appliedDiscountIds.length > 0) {
    for (const discountId of appliedDiscountIds) {
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

export const generateOrderNumber = (orderCount) => {
  return `ORD-${(orderCount + 1).toString().padStart(4, '0')}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

export const getOrderStatusColor = (status) => {
  const colors = {
    'draft': 'gray',
    'pending': 'yellow',
    'confirmed': 'blue',
    'preparing': 'orange',
    'ready': 'green',
    'completed': 'green',
    'cancelled': 'red'
  };
  return colors[status] || 'gray';
};