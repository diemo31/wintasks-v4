import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GlobalProvider, useGlobal } from './src/context/GlobalContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardAdultoScreen from './src/screens/DashboardAdultoScreen';
import DashboardMenorScreen from './src/screens/DashboardMenorScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import TareasEnCursoScreen from './src/screens/TareasEnCursoScreen';
import MisDataScreen from './src/screens/MisDataScreen';
import CambiarNumeroScreen from './src/screens/CambiarNumeroScreen';
import CambiarClaveScreen from './src/screens/CambiarClaveScreen';
import MembresiaScreen from './src/screens/MembresiaScreen';
import InvitarScreen from './src/screens/InvitarScreen';
import MisPuntosScreen from './src/screens/MisPuntosScreen';
import { Colors } from './src/theme';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { currentUser } = useGlobal();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FF8C00',
        },
        headerTintColor: '#FEFCF8',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#EDE0D4' },
      }}
    >
      {!currentUser ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar sesión' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear cuenta' }} />
        </>
      ) : currentUser.role === 'adulto' ? (
        <Stack.Group>
          <Stack.Screen name="DashboardAdulto" component={DashboardAdultoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateTask" component={CreateTaskScreen} options={{ title: 'Crear tarea' }} />
          <Stack.Screen name="TareasEnCurso" component={TareasEnCursoScreen} options={{ title: 'Tareas en curso' }} />
          <Stack.Screen name="MisData" component={MisDataScreen} options={{ title: 'Mis datos' }} />
          <Stack.Screen name="CambiarNumero" component={CambiarNumeroScreen} options={{ title: 'Cambiar mi número' }} />
          <Stack.Screen name="CambiarClave" component={CambiarClaveScreen} options={{ title: 'Cambiar clave' }} />
          <Stack.Screen name="Membresia" component={MembresiaScreen} options={{ title: 'Membresía' }} />
          <Stack.Screen name="Invitar" component={InvitarScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MisPuntos" component={MisPuntosScreen} options={{ headerShown: false }} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="DashboardMenor" component={DashboardMenorScreen} options={{ title: 'WinTasks', headerBackVisible: false }} />
          <Stack.Screen name="TareasMenor" component={TareasEnCursoScreen} options={{ title: 'Mis tareas' }} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GlobalProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </GlobalProvider>
  );
}
