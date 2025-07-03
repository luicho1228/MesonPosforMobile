import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import NewOrderScreen from '../screens/NewOrderScreen';
import ActiveOrdersScreen from '../screens/ActiveOrdersScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import TableManagementScreen from '../screens/TableManagementScreen';
import CustomerManagementScreen from '../screens/CustomerManagementScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigators for each tab
const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="NewOrder" 
      component={NewOrderScreen}
      options={{ title: 'New Order' }}
    />
  </Stack.Navigator>
);

const OrdersStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ActiveOrders" 
      component={ActiveOrdersScreen}
      options={{ title: 'Active Orders' }}
    />
    <Stack.Screen 
      name="OrderHistory" 
      component={OrderHistoryScreen}
      options={{ title: 'Order History' }}
    />
  </Stack.Navigator>
);

const ManagementStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="TableManagement" 
      component={TableManagementScreen}
      options={{ title: 'Table Management' }}
    />
    <Stack.Screen 
      name="CustomerManagement" 
      component={CustomerManagementScreen}
      options={{ title: 'Customer Management' }}
    />
    <Stack.Screen 
      name="NewOrder" 
      component={NewOrderScreen}
      options={{ title: 'New Order' }}
    />
  </Stack.Navigator>
);

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'dashboard';
          } else if (route.name === 'Orders') {
            iconName = 'receipt';
          } else if (route.name === 'Management') {
            iconName = 'table-restaurant';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardStack}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersStack}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="Management" 
        component={ManagementStack}
        options={{ title: 'Management' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;