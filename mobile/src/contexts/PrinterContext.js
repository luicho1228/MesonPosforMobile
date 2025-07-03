import React, { createContext, useContext, useState } from 'react';
import ThermalPrinterService from '../services/ThermalPrinterService';

const PrinterContext = createContext();

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

const PrinterProvider = ({ children }) => {
  const [showPrinterManager, setShowPrinterManager] = useState(false);
  const printerService = ThermalPrinterService();

  const printOrderReceipt = async (order) => {
    try {
      const context = order.order_type === 'delivery' ? 'delivery' : 'dine_in';
      await printerService.printReceipt(order, context);
      return { success: true };
    } catch (error) {
      console.error('Print order receipt error:', error);
      return { success: false, error: error.message };
    }
  };

  const openPrinterManager = () => {
    setShowPrinterManager(true);
  };

  const closePrinterManager = () => {
    setShowPrinterManager(false);
  };

  const value = {
    ...printerService,
    printOrderReceipt,
    openPrinterManager,
    closePrinterManager,
    showPrinterManager
  };

  return (
    <PrinterContext.Provider value={value}>
      {children}
    </PrinterContext.Provider>
  );
};

export default PrinterProvider;