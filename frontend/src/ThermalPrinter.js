import React, { useState, useCallback } from 'react';

const ThermalPrinter = () => {
  const [printer, setPrinter] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);

  // Store information
  const storeInfo = {
    name: 'El Meson Restaurant',
    address: '3517 Broadway',
    phone: '929-321-9679'
  };

  // ESC/POS Commands
  const escPosCommands = {
    initialize: () => new Uint8Array([0x1B, 0x40]),
    text: (text) => new TextEncoder().encode(text),
    lineFeed: (lines = 1) => new Uint8Array([0x0A].repeat(lines)),
    centerAlign: () => new Uint8Array([0x1B, 0x61, 0x01]),
    leftAlign: () => new Uint8Array([0x1B, 0x61, 0x00]),
    boldOn: () => new Uint8Array([0x1B, 0x45, 0x01]),
    boldOff: () => new Uint8Array([0x1B, 0x45, 0x00]),
    cut: () => new Uint8Array([0x1D, 0x56, 0x41]),
    openDrawer: () => new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]),
    doubleHeight: () => new Uint8Array([0x1B, 0x21, 0x10]),
    normalSize: () => new Uint8Array([0x1B, 0x21, 0x00])
  };

  const requestPrinter = async () => {
    if (!navigator.usb) {
      setStatus('WebUSB not supported in this browser. Please use Chrome or Edge.');
      return false;
    }

    setIsConnecting(true);
    try {
      let device;
      
      // First, try to get already authorized devices
      const existingDevices = await navigator.usb.getDevices();
      const starDevice = existingDevices.find(device => 
        device.vendorId === 0x0519 && 
        (device.productId === 0x0003 || device.productId === 0x0001)
      );

      if (starDevice) {
        console.log('Found existing authorized Star device');
        device = starDevice;
        
        // If device is open, close it first
        if (device.opened) {
          console.log('Device already open, closing...');
          try {
            await device.close();
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (closeError) {
            console.warn('Error closing device:', closeError);
            // Continue anyway
          }
        }
      } else {
        console.log('Requesting new device authorization');
        // Make sure this is only called from user action
        if (!event || !event.isTrusted) {
          throw new Error('Must be called from user interaction');
        }
        
        device = await navigator.usb.requestDevice({
          filters: [
            { vendorId: 0x0519 }, // Star Micronics vendor ID
            { vendorId: 0x0519, productId: 0x0003 }, // TSP III specific
            { vendorId: 0x0519, productId: 0x0001 }, // TSP100 alternative
          ]
        });
      }

      console.log('Opening device...');
      await device.open();
      
      console.log('Selecting configuration...');
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      console.log('Claiming interface...');
      await device.claimInterface(0);
      
      setPrinter(device);
      setStatus('Connected to Star TSP III');
      
      // Test the connection with a simple command
      try {
        await device.transferOut(1, new Uint8Array([0x1B, 0x40])); // Initialize command
        console.log('Connection test successful');
      } catch (testError) {
        console.warn('Connection test failed, but device seems connected:', testError);
      }
      
      return true;
      
    } catch (error) {
      console.error('Printer connection error:', error);
      
      let errorMessage = 'Connection failed: ';
      if (error.name === 'NotFoundError') {
        errorMessage += 'No printer selected. Please try again.';
      } else if (error.name === 'SecurityError' || error.message.includes('Access denied')) {
        errorMessage += 'USB Access denied. Try this: 1) Disconnect USB cable 2) Close other printer apps 3) Reconnect USB cable 4) Click Connect again';
      } else if (error.name === 'NetworkError') {
        errorMessage += 'Device communication error. Disconnect and reconnect USB cable.';
      } else if (error.name === 'InvalidStateError') {
        errorMessage += 'Device in use. Close other apps using the printer and try again.';
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      setStatus(errorMessage);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = async () => {
    if (printer) {
      try {
        console.log('Disconnecting printer...');
        await printer.close();
        setPrinter(null);
        setStatus('Disconnected');
      } catch (error) {
        console.error('Error disconnecting printer:', error);
        setPrinter(null);
        setStatus('Disconnected (forced)');
      }
    }
  };

  const reconnectPrinter = async () => {
    await disconnectPrinter();
    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await requestPrinter();
  };

  const sendCommand = async (commandArray) => {
    if (!printer) {
      throw new Error('Printer not connected');
    }

    try {
      const flatArray = commandArray.flat();
      const data = new Uint8Array(flatArray);
      await printer.transferOut(1, data);
    } catch (error) {
      console.error('Print command error:', error);
      throw error;
    }
  };

  const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US'),
      time: date.toLocaleTimeString('en-US', { hour12: true })
    };
  };

  const printDineInReceipt = async (orderData) => {
    const { date, time } = formatDateTime(orderData.created_at || new Date());
    
    const commands = [
      escPosCommands.initialize(),
      escPosCommands.centerAlign(),
      escPosCommands.boldOn(),
      escPosCommands.doubleHeight(),
      escPosCommands.text(`${storeInfo.name}\n`),
      escPosCommands.normalSize(),
      escPosCommands.boldOff(),
      escPosCommands.text(`${storeInfo.address}\n`),
      escPosCommands.text(`Phone: ${storeInfo.phone}\n`),
      escPosCommands.lineFeed(1),
      escPosCommands.leftAlign(),
      escPosCommands.text('================================\n'),
      escPosCommands.text(`Order #: ${orderData.order_number || 'N/A'}\n`),
      escPosCommands.text(`Date: ${date}\n`),
      escPosCommands.text(`Time: ${time}\n`),
      escPosCommands.text(`Type: ${orderData.order_type?.replace('_', ' ').toUpperCase() || 'DINE IN'}\n`),
      
      // Table info for dine-in
      ...(orderData.table_number ? [
        escPosCommands.text(`Table: ${orderData.table_number}\n`)
      ] : []),
      
      escPosCommands.text('================================\n'),
      escPosCommands.lineFeed(1),
      
      // Items
      ...(orderData.items || []).flatMap(item => [
        escPosCommands.text(`${item.menu_item_name || item.name}\n`),
        escPosCommands.text(`  Qty: ${item.quantity} x ${formatPrice(item.base_price || item.price)}\n`),
        
        // Modifiers
        ...(item.modifiers || []).flatMap(modifier => [
          escPosCommands.text(`    + ${modifier.name} ${formatPrice(modifier.price)}\n`)
        ]),
        
        escPosCommands.text(`  Total: ${formatPrice(item.total_price || (item.quantity * item.price))}\n`),
        escPosCommands.lineFeed(1)
      ]),
      
      escPosCommands.text('================================\n'),
      escPosCommands.text(`Subtotal: ${formatPrice(orderData.subtotal || orderData.total || 0)}\n`),
      escPosCommands.text(`Tax: ${formatPrice(orderData.tax || 0)}\n`),
      escPosCommands.boldOn(),
      escPosCommands.text(`TOTAL: ${formatPrice(orderData.total || 0)}\n`),
      escPosCommands.boldOff(),
      escPosCommands.lineFeed(1),
      
      // Payment info if available
      ...(orderData.payment_method ? [
        escPosCommands.text(`Payment: ${orderData.payment_method.toUpperCase()}\n`),
        ...(orderData.change_amount ? [
          escPosCommands.text(`Change: ${formatPrice(orderData.change_amount)}\n`)
        ] : [])
      ] : []),
      
      escPosCommands.lineFeed(1),
      escPosCommands.centerAlign(),
      escPosCommands.text('Thank you for dining with us!\n'),
      escPosCommands.lineFeed(4),
      escPosCommands.cut()
    ];

    await sendCommand(commands);
  };

  const printDeliveryReceipt = async (orderData) => {
    const { date, time } = formatDateTime(orderData.created_at || new Date());
    
    const commands = [
      escPosCommands.initialize(),
      escPosCommands.centerAlign(),
      escPosCommands.boldOn(),
      escPosCommands.doubleHeight(),
      escPosCommands.text(`${storeInfo.name}\n`),
      escPosCommands.normalSize(),
      escPosCommands.boldOff(),
      escPosCommands.text(`${storeInfo.address}\n`),
      escPosCommands.text(`Phone: ${storeInfo.phone}\n`),
      escPosCommands.lineFeed(1),
      escPosCommands.leftAlign(),
      escPosCommands.text('================================\n'),
      escPosCommands.text(`Order #: ${orderData.order_number || 'N/A'}\n`),
      escPosCommands.text(`Date: ${date}\n`),
      escPosCommands.text(`Time: ${time}\n`),
      escPosCommands.text('Type: DELIVERY\n'),
      escPosCommands.text('================================\n'),
      escPosCommands.lineFeed(1),
      
      // Customer Information
      escPosCommands.boldOn(),
      escPosCommands.text('CUSTOMER INFORMATION:\n'),
      escPosCommands.boldOff(),
      escPosCommands.text(`Name: ${orderData.customer_name || 'N/A'}\n`),
      escPosCommands.text(`Phone: ${orderData.customer_phone || 'N/A'}\n`),
      escPosCommands.text(`Address: ${orderData.customer_address || 'N/A'}\n`),
      escPosCommands.lineFeed(1),
      escPosCommands.text('================================\n'),
      escPosCommands.lineFeed(1),
      
      // Items
      ...(orderData.items || []).flatMap(item => [
        escPosCommands.text(`${item.menu_item_name || item.name}\n`),
        escPosCommands.text(`  Qty: ${item.quantity} x ${formatPrice(item.base_price || item.price)}\n`),
        
        // Modifiers
        ...(item.modifiers || []).flatMap(modifier => [
          escPosCommands.text(`    + ${modifier.name} ${formatPrice(modifier.price)}\n`)
        ]),
        
        escPosCommands.text(`  Total: ${formatPrice(item.total_price || (item.quantity * item.price))}\n`),
        escPosCommands.lineFeed(1)
      ]),
      
      escPosCommands.text('================================\n'),
      escPosCommands.text(`Subtotal: ${formatPrice(orderData.subtotal || orderData.total || 0)}\n`),
      escPosCommands.text(`Tax: ${formatPrice(orderData.tax || 0)}\n`),
      escPosCommands.boldOn(),
      escPosCommands.text(`TOTAL: ${formatPrice(orderData.total || 0)}\n`),
      escPosCommands.boldOff(),
      escPosCommands.lineFeed(1),
      
      // Payment info
      escPosCommands.boldOn(),
      escPosCommands.text('PAYMENT INFORMATION:\n'),
      escPosCommands.boldOff(),
      escPosCommands.text(`Method: ${orderData.payment_method?.toUpperCase() || 'N/A'}\n`),
      ...(orderData.change_amount ? [
        escPosCommands.text(`Change: ${formatPrice(orderData.change_amount)}\n`)
      ] : []),
      
      escPosCommands.lineFeed(1),
      escPosCommands.centerAlign(),
      escPosCommands.text('Thank you for your order!\n'),
      escPosCommands.lineFeed(4),
      escPosCommands.cut()
    ];

    await sendCommand(commands);
  };

  const printReceipt = async (orderData, context = 'dine_in') => {
    if (!printer) {
      // Try to auto-connect if not connected
      const connected = await requestPrinter();
      if (!connected) {
        alert('Please connect the printer first');
        return;
      }
    }

    setStatus('Printing...');
    
    try {
      if (context === 'delivery' || orderData.order_type === 'delivery') {
        await printDeliveryReceipt(orderData);
      } else {
        await printDineInReceipt(orderData);
      }
      
      setStatus('Print completed successfully');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setStatus(printer ? 'Connected to Star TSP III' : 'Disconnected');
      }, 3000);

    } catch (error) {
      console.error('Print error:', error);
      setStatus(`Print failed: ${error.message}`);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setStatus(printer ? 'Connected to Star TSP III' : 'Disconnected');
      }, 5000);
    }
  };

  const testPrint = async () => {
    const testReceipt = {
      order_number: 'TEST001',
      created_at: new Date(),
      order_type: 'dine_in',
      table_number: 5,
      items: [
        { 
          menu_item_name: 'Chicken Burrito', 
          quantity: 1, 
          base_price: 12.99,
          total_price: 12.99,
          modifiers: []
        },
        { 
          menu_item_name: 'Beef Tacos', 
          quantity: 2, 
          base_price: 8.50,
          total_price: 17.00,
          modifiers: [
            { name: 'Extra Cheese', price: 1.50 }
          ]
        }
      ],
      subtotal: 29.99,
      tax: 2.40,
      total: 32.39,
      payment_method: 'cash',
      change_amount: 7.61
    };
    
    await printReceipt(testReceipt, 'dine_in');
  };

  return {
    printer,
    status,
    isConnecting,
    requestPrinter,
    disconnectPrinter,
    reconnectPrinter,
    printReceipt,
    testPrint,
    connected: !!printer
  };
};

export default ThermalPrinter;