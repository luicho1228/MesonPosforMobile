import React, { createContext, useContext, useState } from 'react';
import ThermalPrinter from './ThermalPrinter';
import StarWebPRNTPrinter from './StarWebPRNTPrinter';

const PrinterContext = createContext();

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

export const PrinterProvider = ({ children }) => {
  const [showPrinterManager, setShowPrinterManager] = useState(false);
  const [printerType, setPrinterType] = useState('webusb'); // 'webusb' or 'webprnt'
  
  const webUSBPrinter = ThermalPrinter();
  const webPRNTPrinter = StarWebPRNTPrinter();
  
  const activePrinter = printerType === 'webprnt' ? webPRNTPrinter : webUSBPrinter;

  const printOrderReceipt = async (order) => {
    try {
      const context = order.order_type === 'delivery' ? 'delivery' : 'dine_in';
      await activePrinter.printReceipt(order, context);
    } catch (error) {
      console.error('Print order receipt error:', error);
      alert('Failed to print receipt. Please check printer connection.');
    }
  };

  const openPrinterManager = () => {
    setShowPrinterManager(true);
  };

  const closePrinterManager = () => {
    setShowPrinterManager(false);
  };

  const switchPrinterType = (type) => {
    setPrinterType(type);
  };

  const value = {
    ...activePrinter,
    printOrderReceipt,
    openPrinterManager,
    closePrinterManager,
    showPrinterManager,
    printerType,
    switchPrinterType
  };

  return (
    <PrinterContext.Provider value={value}>
      {children}
      
      {/* Printer Manager Modal */}
      {showPrinterManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Printer Manager</h3>
              <button
                onClick={closePrinterManager}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Status */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">Status:</div>
                <div className={`text-sm ${
                  activePrinter.connected ? 'text-green-600' : 
                  activePrinter.status.includes('failed') || activePrinter.status.includes('Error') ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {activePrinter.status}
                </div>
              </div>

              {/* Connection Buttons */}
              {!activePrinter.connected ? (
                <button
                  onClick={activePrinter.requestPrinter}
                  disabled={activePrinter.isConnecting}
                  className={`w-full py-2 px-4 rounded-lg font-medium ${
                    activePrinter.isConnecting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {activePrinter.isConnecting ? 'Connecting...' : 'Connect Printer'}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={activePrinter.disconnectPrinter}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={activePrinter.reconnectPrinter}
                    disabled={activePrinter.isConnecting}
                    className={`w-full py-2 px-4 rounded-lg font-medium ${
                      activePrinter.isConnecting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {activePrinter.isConnecting ? 'Reconnecting...' : 'Reconnect'}
                  </button>
                </div>
              )}

              {/* Test Print Button */}
              {activePrinter.connected && (
                <button
                  onClick={activePrinter.testPrint}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
                >
                  Test Print
                </button>
              )}

              {/* Requirements & Troubleshooting */}
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <div className="font-medium mb-1">Requirements:</div>
                <ul className="list-disc list-inside space-y-1 mb-3">
                  <li>Star TSP III in ESC/POS mode</li>
                  <li>USB cable connected</li>
                  <li>Chrome or Edge browser</li>
                  <li>HTTPS connection (or localhost)</li>
                </ul>
                
                <div className="font-medium mb-1">If "Access Denied" error:</div>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Disconnect USB cable from printer</li>
                  <li>Close any printer software or POS apps</li>
                  <li>Reconnect USB cable</li>
                  <li>Click "Connect Printer" again</li>
                  <li>If still failing, try "Reconnect" button</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </PrinterContext.Provider>
  );
};

export default PrinterProvider;