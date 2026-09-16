import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ReorderScreen from '../screens/ReorderScreen';
import AccountScreen from '../screens/AccountScreen';
import { INK } from '../utils/chartColors';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: 'home',
  Reports: 'bar-chart',
  Reorder: 'cart',
  Account: 'person-circle',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: INK.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name] || 'ellipse'} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Reorder" component={ReorderScreen} options={{ title: 'What to Order' }} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
