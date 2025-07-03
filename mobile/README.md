# React Native Restaurant POS App

This is a complete React Native conversion of the Restaurant POS web application, featuring all the same functionality optimized for mobile devices.

## Features

### 🔐 Authentication
- PIN-based login system
- User role management (Manager, Cashier)
- JWT token authentication

### 📱 Core POS Functionality
- **New Order Creation**: Menu browsing, item selection with modifiers
- **Order Types**: Dine-in, Takeout, Delivery
- **Cart Management**: Add/remove items, quantity adjustments
- **Table Management**: Table assignment, status tracking, move/merge orders
- **Customer Management**: Customer database with order history and statistics

### 📋 Order Management
- **Active Orders**: Real-time order tracking with status updates
- **Order History**: Complete transaction history with search and filters
- **Order Processing**: Kitchen workflow (Pending → Preparing → Ready → Delivered)
- **Bulk Operations**: Multi-select order cancellations

### 🖨️ Thermal Printing
- **Bluetooth Receipt Printing**: Compatible with Star TSP III and similar thermal printers
- **Receipt Templates**: Separate templates for dine-in and delivery orders
- **Store Information**: Automatic inclusion of restaurant details
- **Print from Anywhere**: Payment receipts, order history, manual prints

### 👥 Customer Features
- **Customer Database**: Name, phone, email, address tracking
- **Order History**: Complete customer order tracking
- **Statistics**: Total orders, amount spent, last order date
- **Auto-fill**: Delivery address auto-completion

### 📊 Dashboard & Analytics
- **Daily Statistics**: Orders count, revenue, active orders
- **Table Status**: Available/occupied table counts
- **Quick Actions**: Fast access to common tasks
- **Real-time Updates**: Live data refresh

## Technical Stack

- **Frontend**: React Native with React Navigation
- **Backend**: FastAPI (Python) - reuses existing web app backend
- **Database**: MongoDB (shared with web app)
- **Printing**: React Native Bluetooth ESC/POS printer library
- **State Management**: React Context API
- **UI Components**: React Native Paper + custom components
- **Icons**: React Native Vector Icons (Material Icons)

## Installation & Setup

### Prerequisites
- Node.js (v16+)
- React Native development environment
- Android Studio / Xcode for device testing
- Bluetooth thermal printer (Star TSP III recommended)

### Install Dependencies
```bash
cd mobile
yarn install
```

### iOS Setup
```bash
cd ios
pod install
cd ..
```

### Run the App
```bash
# Android
yarn android

# iOS
yarn ios
```

## Printer Setup

### Bluetooth Thermal Printer
1. **Pair Printer**: Pair your Star TSP III with your mobile device via Bluetooth
2. **Open POS App**: Launch the restaurant POS app
3. **Printer Manager**: Go to Settings → Printer Settings
4. **Scan & Connect**: Scan for available printers and connect
5. **Test Print**: Use the test print function to verify connection

### Supported Printers
- Star TSP III series
- Star TSP100 series
- Most ESC/POS compatible thermal printers

## App Structure

```
mobile/
├── src/
│   ├── contexts/          # React contexts (Auth, Printer)
│   ├── navigation/        # React Navigation setup
│   ├── screens/          # All app screens
│   │   ├── PinLoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── NewOrderScreen.js
│   │   ├── ActiveOrdersScreen.js
│   │   ├── OrderHistoryScreen.js
│   │   ├── TableManagementScreen.js
│   │   ├── CustomerManagementScreen.js
│   │   └── SettingsScreen.js
│   └── services/         # Business logic services
│       └── ThermalPrinterService.js
├── App.js               # Main app component
├── index.js            # App entry point
└── package.json        # Dependencies
```

## Key Differences from Web Version

### Mobile-Optimized UI
- **Touch-friendly**: Large buttons and touch targets
- **Mobile Navigation**: Bottom tab navigation with stack navigators
- **Responsive Design**: Adapts to different screen sizes
- **Native Components**: Uses React Native UI components

### Enhanced Mobile Features
- **Bluetooth Printing**: Direct Bluetooth thermal printer integration
- **Touch Gestures**: Swipe, long-press, and pinch gestures
- **Mobile Keyboards**: Optimized input types (phone, email, numeric)
- **Device Integration**: Camera, location (if needed for future features)

### Performance Optimizations
- **FlatList**: Virtualized lists for large datasets
- **Image Optimization**: Optimized image loading and caching
- **Memory Management**: Efficient state management for mobile
- **Background Tasks**: Proper handling of app lifecycle

## Restaurant Information

The app is configured for **El Meson Restaurant**:
- **Address**: 3517 Broadway
- **Phone**: 929-321-9679
- **Hours**: Customizable in settings

## User Roles & Permissions

### Manager
- Full access to all features
- Order management and cancellations
- Table management operations
- Customer management
- Settings and printer configuration

### Cashier
- Order creation and processing
- Payment processing
- Basic table operations
- Customer lookup

## API Integration

The mobile app connects to the same FastAPI backend as the web version:
- **Base URL**: Configured in AuthContext
- **Endpoints**: All existing REST API endpoints
- **Authentication**: JWT token-based auth
- **Real-time**: Polling for live updates

## Development Notes

### Adding New Features
1. Create screen components in `src/screens/`
2. Add navigation routes in `src/navigation/`
3. Update contexts for shared state
4. Test on both iOS and Android

### Customization
- **Colors**: Update theme colors in component styles
- **Restaurant Info**: Modify store information in ThermalPrinterService
- **Business Logic**: Extend services for custom functionality

### Deployment
- **Android**: Generate APK/AAB for Google Play Store
- **iOS**: Generate IPA for App Store
- **Enterprise**: Configure for internal distribution

## Support

For technical support or feature requests, refer to the original web application documentation and extend functionality as needed.

## License

© 2024 El Meson Restaurant POS System. All rights reserved.