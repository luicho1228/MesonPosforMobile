import React, { useState } from 'react';

const StarWebPRNTPrinter = () => {
  const [status, setStatus] = useState('Ready');
  const [isConnecting, setIsConnecting] = useState(false);

  // Store information
  const storeInfo = {
    name: 'El Meson Restaurant',
    address: '3517 Broadway',
    phone: '929-321-9679'
  };

  const checkWebPRNTAvailable = async () => {
    try {
      const response = await fetch('http://localhost:8001/StarWebPRNT/GetPortInfo');
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const buildReceiptCommand = (orderData) => {
    const commands = [];
    
    // Initialize printer
    commands.push('<initialize/>');
    
    // Store header
    commands.push('<alignment position="center"/>');
    commands.push('<text emphasis="true" size="large">');
    commands.push(`${storeInfo.name}\n`);
    commands.push('</text>');
    commands.push(`<text>${storeInfo.address}\n</text>`);
    commands.push(`<text>Phone: ${storeInfo.phone}\n\n</text>`);
    
    commands.push('<alignment position="left"/>');
    commands.push('<text>--------------------------------\n</text>');
    
    // Order details
    if (orderData.order_number) {
      commands.push(`<text>Order #: ${orderData.order_number}\n</text>`);
    }
    if (orderData.created_at) {
      const date = new Date(orderData.created_at);
      commands.push(`<text>Date: ${date.toLocaleDateString()}\n</text>`);
      commands.push(`<text>Time: ${date.toLocaleTimeString()}\n</text>`);
    }
    if (orderData.order_type) {
      commands.push(`<text>Type: ${orderData.order_type.replace('_', ' ').toUpperCase()}\n</text>`);
    }
    if (orderData.table_number) {
      commands.push(`<text>Table: ${orderData.table_number}\n</text>`);
    }
    
    commands.push('<text>--------------------------------\n\n</text>');
    
    // Customer info for delivery
    if (orderData.order_type === 'delivery' && orderData.customer_name) {
      commands.push('<text emphasis="true">CUSTOMER INFORMATION:\n</text>');
      commands.push(`<text>Name: ${orderData.customer_name}\n</text>`);
      if (orderData.customer_phone) {
        commands.push(`<text>Phone: ${orderData.customer_phone}\n</text>`);
      }
      if (orderData.customer_address) {
        commands.push(`<text>Address: ${orderData.customer_address}\n</text>`);
      }
      commands.push('<text>--------------------------------\n\n</text>');
    }
    
    // Items
    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach(item => {
        const itemName = item.menu_item_name || item.name || 'Item';
        const quantity = item.quantity || 1;
        const price = item.total_price || item.price || 0;
        
        commands.push(`<text>${itemName}\n</text>`);
        commands.push(`<text>  Qty: ${quantity} x $${(price/quantity).toFixed(2)}\n</text>`);
        
        // Modifiers
        if (item.modifiers && item.modifiers.length > 0) {
          item.modifiers.forEach(modifier => {
            commands.push(`<text>    + ${modifier.name} $${modifier.price.toFixed(2)}\n</text>`);
          });
        }
        
        commands.push(`<text>  Total: $${price.toFixed(2)}\n\n</text>`);
      });
    }
    
    commands.push('<text>--------------------------------\n</text>');
    
    // Totals
    if (orderData.subtotal) {
      commands.push(`<text>Subtotal: $${orderData.subtotal.toFixed(2)}\n</text>`);
    }
    if (orderData.tax) {
      commands.push(`<text>Tax: $${orderData.tax.toFixed(2)}\n</text>`);
    }
    if (orderData.total) {
      commands.push('<text emphasis="true">');
      commands.push(`TOTAL: $${orderData.total.toFixed(2)}\n`);
      commands.push('</text>');
    }
    
    // Payment info
    if (orderData.payment_method) {
      commands.push('\n<text emphasis="true">PAYMENT INFORMATION:\n</text>');
      commands.push(`<text>Method: ${orderData.payment_method.toUpperCase()}\n</text>`);
      if (orderData.change_amount && orderData.change_amount > 0) {
        commands.push(`<text>Change: $${orderData.change_amount.toFixed(2)}\n</text>`);
      }
    }
    
    // Footer
    commands.push('\n<alignment position="center"/>');
    commands.push('<text>Thank you for your business!\n</text>');
    commands.push('\n\n\n');
    
    // Cut paper
    commands.push('<cut feed="true"/>');
    
    return commands.join('');
  };

  const printReceipt = async (orderData) => {
    setIsConnecting(true);
    setStatus('Checking printer...');
    
    try {
      // Check if Star WebPRNT Browser is running
      const isAvailable = await checkWebPRNTAvailable();
      if (!isAvailable) {
        throw new Error('Star WebPRNT Browser not running. Please start it first.');
      }
      
      setStatus('Building receipt...');
      const printCommand = buildReceiptCommand(orderData);
      
      setStatus('Printing...');
      const response = await fetch('http://localhost:8001/StarWebPRNT/SendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: printCommand
      });
      
      if (!response.ok) {
        throw new Error(`Print failed: ${response.statusText}`);
      }
      
      const result = await response.text();
      console.log('Print result:', result);
      
      setStatus('Print completed successfully');
      
      // Reset status after 3 seconds
      setTimeout(() => setStatus('Ready'), 3000);
      
    } catch (error) {
      console.error('Print error:', error);
      setStatus(`Print failed: ${error.message}`);
      
      // Reset status after 5 seconds
      setTimeout(() => setStatus('Ready'), 5000);
    } finally {
      setIsConnecting(false);
    }
  };

  const testPrint = async () => {
    const testData = {
      order_number: 'TEST001',
      created_at: new Date().toISOString(),
      order_type: 'dine_in',
      table_number: 5,
      items: [
        {
          menu_item_name: 'Chicken Burrito',
          quantity: 1,
          price: 12.99,
          total_price: 12.99,
          modifiers: []
        },
        {
          menu_item_name: 'Beef Tacos',
          quantity: 2,
          price: 8.50,
          total_price: 18.50,
          modifiers: [
            { name: 'Extra Cheese', price: 1.00 }
          ]
        }
      ],
      subtotal: 31.49,
      tax: 2.52,
      total: 34.01,
      payment_method: 'cash',
      change_amount: 5.99
    };
    
    await printReceipt(testData);
  };

  return {
    status,
    isConnecting,
    printReceipt,
    testPrint,
    checkWebPRNTAvailable,
    connected: status.includes('Ready') || status.includes('completed')
  };
};

export default StarWebPRNTPrinter;