# Star TSP III Thermal Printer Integration

## Quick Setup Guide

### 1. Printer Configuration
1. Download **Star Configuration Utility** from Star Micronics support website
2. Connect your Star TSP III printer via USB cable
3. Open Star Configuration Utility
4. Navigate to **General Settings → Emulation**
5. Select **ESC/POS Mode**
6. Apply settings and restart printer

### 2. Browser Requirements
- **Chrome or Edge browser** (Safari/Firefox don't support WebUSB)
- **HTTPS connection** (automatic in production, localhost works for development)

### 3. Using the Printer
1. Click **"Printer Manager"** button on main dashboard
2. Click **"Connect Printer"** and select your Star TSP III from the list
3. Once connected, you can:
   - **Print from Payment Modal**: Receipts auto-print when "Print Receipt" is checked
   - **Print from Order History**: Click "Print" button in any order detail
   - **Print from Menu**: Click "Print Receipt" button in cart section

### 4. Receipt Types

#### Dine-in Receipt Includes:
- El Meson Restaurant header with address and phone
- Order number, date, time, table number
- All ordered items with modifiers and prices
- Subtotal, tax, and total
- Payment method and change (if applicable)

#### Delivery Receipt Includes:
- Same as dine-in PLUS:
- Customer name, phone, and delivery address
- Payment information section

### 5. Troubleshooting

**"WebUSB not supported"**
→ Use Chrome or Edge browser with HTTPS

**"Device not found"**
→ Ensure printer is in ESC/POS mode and USB connected

**"Permission denied"**
→ User must click "Connect Printer" button, not automatic

**Partial/garbled prints**
→ Printer will auto-initialize before each print job

### 6. Store Information
Current settings:
- **Restaurant**: El Meson Restaurant  
- **Address**: 3517 Broadway
- **Phone**: 929-321-9679

To change store info, edit the `storeInfo` object in `/frontend/src/ThermalPrinter.js`.

### 7. Features
- ✅ Auto-print after payment (if enabled)
- ✅ Manual print from order history
- ✅ Print test receipts
- ✅ Real-time printer status
- ✅ ESC/POS thermal formatting
- ✅ Receipt cutting after print
- ✅ Error handling and reconnection

The printer integration uses WebUSB API for direct browser-to-printer communication, providing reliable thermal printing for your POS system.