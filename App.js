import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/context/LanguageContext';


const RootNavigation = () => {
  const { userToken, loading } = useAuth();

  // Request location permission globally when the app mounts
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission Denied",
          "We need location permissions to display the map correctly."
        );
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  } else {
    return (
      <NavigationContainer>
        {userToken ? <MainStackNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    );
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
            <StatusBar style="auto" />
            <RootNavigation />
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});