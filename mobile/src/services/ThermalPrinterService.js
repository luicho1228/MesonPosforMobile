import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { BluetoothManager, BluetoothEscposPrinter } from 'react-native-bluetooth-escpos-printer';

const ThermalPrinterService = () => {
  const [status, setStatus] = useState('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);

  // Store information
  const storeInfo = {
    name: 'El Meson Restaurant',
    address: '3517 Broadway',
    phone: '929-321-9679'
  };

  useEffect(() => {
    checkBluetoothStatus();
  }, []);

  const checkBluetoothStatus = async () => {
    try {
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        setStatus('Bluetooth disabled');
        return false;
      }
      setStatus('Ready');
      return true;
    } catch (error) {
      console.error('Bluetooth check error:', error);
      setStatus('Bluetooth error');
      return false;
    }
  };

  const scanForDevices = async () => {
    setIsConnecting(true);
    setStatus('Scanning...');
    
    try {
      const isEnabled = await checkBluetoothStatus();
      if (!isEnabled) {
        Alert.alert('Bluetooth Required', 'Please enable Bluetooth to scan for printers');
        return;
      }

      const pairedDevices = await BluetoothManager.getBondedDevices();
      const starDevices = pairedDevices.filter(device => 
        device.name && (
          device.name.toLowerCase().includes('star') ||
          device.name.toLowerCase().includes('tsp')
        )
      );
      
      setAvailableDevices(starDevices);
      setStatus(`Found ${starDevices.length} Star printer(s)`);
      
      if (starDevices.length === 0) {
        Alert.alert(
          'No Star Printers Found', 
          'Please pair your Star TSP III printer in Bluetooth settings first'
        );
      }
      
    } catch (error) {
      console.error('Scan error:', error);
      setStatus('Scan failed');
      Alert.alert('Scan Error', error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectToPrinter = async (device) => {
    setIsConnecting(true);
    setStatus('Connecting...');
    
    try {
      await BluetoothManager.connect(device.address);
      setConnectedDevice(device);
      setStatus(`Connected to ${device.name}`);
      
      // Test connection
      await BluetoothEscposPrinter.printerInit();
      
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('Connection failed');
      Alert.alert('Connection Error', error.message);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      if (connectedDevice) {
        await BluetoothManager.disconnect();
        setConnectedDevice(null);
        setStatus('Disconnected');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const formatPrice = (price) => {
    return `$${parseFloat(price || 0).toFixed(2)}`;
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US'),
      time: date.toLocaleTimeString('en-US', { hour12: true })
    };
  };

  const printReceipt = async (orderData, context = 'dine_in') => {
    if (!connectedDevice) {
      throw new Error('No printer connected');
    }

    setStatus('Printing...');
    
    try {
      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printerLeftSpace(0);
      
      // Print header
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText(`${storeInfo.name}\n`, {
        encoding: 'GBK',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        fonttype: 1
      });
      
      await BluetoothEscposPrinter.printText(`${storeInfo.address}\n`, {});
      await BluetoothEscposPrinter.printText(`Phone: ${storeInfo.phone}\n\n`, {});
      
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
      await BluetoothEscposPrinter.printText('--------------------------------\n', {});
      
      // Order details
      const { date, time } = formatDateTime(orderData.created_at || new Date());
      
      if (orderData.order_number) {
        await BluetoothEscposPrinter.printText(`Order #: ${orderData.order_number}\n`, {});
      }
      await BluetoothEscposPrinter.printText(`Date: ${date}\n`, {});
      await BluetoothEscposPrinter.printText(`Time: ${time}\n`, {});
      await BluetoothEscposPrinter.printText(`Type: ${(orderData.order_type || 'dine_in').replace('_', ' ').toUpperCase()}\n`, {});
      
      if (orderData.table_number) {
        await BluetoothEscposPrinter.printText(`Table: ${orderData.table_number}\n`, {});
      }
      
      await BluetoothEscposPrinter.printText('--------------------------------\n\n', {});
      
      // Customer information for delivery
      if (context === 'delivery' && orderData.customer_name) {
        await BluetoothEscposPrinter.printText('CUSTOMER INFORMATION:\n', {
          widthtimes: 1,
          heigthtimes: 1,
          fonttype: 1
        });
        await BluetoothEscposPrinter.printText(`Name: ${orderData.customer_name}\n`, {});
        if (orderData.customer_phone) {
          await BluetoothEscposPrinter.printText(`Phone: ${orderData.customer_phone}\n`, {});
        }
        if (orderData.customer_address) {
          await BluetoothEscposPrinter.printText(`Address: ${orderData.customer_address}\n`, {});
        }
        await BluetoothEscposPrinter.printText('--------------------------------\n\n', {});
      }
      
      // Items
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const itemName = item.menu_item_name || item.name || 'Item';
          const quantity = item.quantity || 1;
          const price = item.total_price || item.price || 0;
          
          await BluetoothEscposPrinter.printText(`${itemName}\n`, {});
          await BluetoothEscposPrinter.printText(`  Qty: ${quantity} x ${formatPrice(price/quantity)}\n`, {});
          
          // Modifiers
          if (item.modifiers && item.modifiers.length > 0) {
            for (const modifier of item.modifiers) {
              await BluetoothEscposPrinter.printText(`    + ${modifier.name} ${formatPrice(modifier.price)}\n`, {});
            }
          }
          
          await BluetoothEscposPrinter.printText(`  Total: ${formatPrice(price)}\n\n`, {});
        }
      }
      
      await BluetoothEscposPrinter.printText('--------------------------------\n', {});
      
      // Totals
      if (orderData.subtotal) {
        await BluetoothEscposPrinter.printText(`Subtotal: ${formatPrice(orderData.subtotal)}\n`, {});
      }
      if (orderData.tax) {
        await BluetoothEscposPrinter.printText(`Tax: ${formatPrice(orderData.tax)}\n`, {});
      }
      if (orderData.total) {
        await BluetoothEscposPrinter.printText(`TOTAL: ${formatPrice(orderData.total)}\n`, {
          widthtimes: 1,
          heigthtimes: 1,
          fonttype: 1
        });
      }
      
      // Payment information
      if (orderData.payment_method) {
        await BluetoothEscposPrinter.printText('\nPAYMENT INFORMATION:\n', {
          widthtimes: 1,
          heigthtimes: 1,
          fonttype: 1
        });
        await BluetoothEscposPrinter.printText(`Method: ${orderData.payment_method.toUpperCase()}\n`, {});
        if (orderData.change_amount && orderData.change_amount > 0) {
          await BluetoothEscposPrinter.printText(`Change: ${formatPrice(orderData.change_amount)}\n`, {});
        }
      }
      
      // Footer
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText('\nThank you for your business!\n', {});
      await BluetoothEscposPrinter.printText('\n\n\n', {});
      
      // Cut paper (if supported)
      try {
        await BluetoothEscposPrinter.cutOnePoint();
      } catch (cutError) {
        console.log('Cut not supported, skipping...');
      }
      
      setStatus('Print completed');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus(connectedDevice ? `Connected to ${connectedDevice.name}` : 'Ready');
      }, 3000);
      
    } catch (error) {
      console.error('Print error:', error);
      setStatus('Print failed');
      throw error;
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
          menu_item_name: 'Test Chicken Burrito',
          quantity: 1,
          price: 12.99,
          total_price: 12.99,
          modifiers: []
        },
        {
          menu_item_name: 'Test Beef Tacos',
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
    
    await printReceipt(testData, 'dine_in');
  };

  return {
    status,
    isConnecting,
    connectedDevice,
    availableDevices,
    connected: !!connectedDevice,
    scanForDevices,
    connectToPrinter,
    disconnectPrinter,
    printReceipt,
    testPrint,
    checkBluetoothStatus
  };
};

export default ThermalPrinterService;