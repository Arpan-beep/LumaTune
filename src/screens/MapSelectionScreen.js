import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView, TextInput, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

export default function MapSelectionScreen({ navigation, route }) {
  const initialLocation = route.params?.currentLocation || { latitude: 41.8058, longitude: -6.7572 };
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [coordText, setCoordText] = useState('');
  const mapRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    Alert.alert(
      t('selectLocationTitle'),
      t('selectLocationMsg')
    );
  }, []);

  const handleMapPress = (e) => setSelectedLocation(e.nativeEvent.coordinate);

  const handleSearchCoords = () => {
    if (!coordText.trim()) return;

    const matches = coordText.match(/-?\d+(\.\d+)?/g);
    if (matches && matches.length >= 2) {
      const lat = parseFloat(matches[0]);
      const lng = parseFloat(matches[1]);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const loc = { latitude: lat, longitude: lng };
        setSelectedLocation(loc);
        mapRef.current?.animateToRegion({
          ...loc,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        return;
      }
    }

    Alert.alert(
      t('invalidCoordinatesTitle'),
      t('invalidCoordinatesMsg')
    );
  };

  const handleConfirm = () => {
    navigation.navigate('Main', {
      screen: 'PlaceSubmissionScreen',
      params: { selectedLocation },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TouchableOpacity onPress={handleSearchCoords} style={styles.searchIconBtn}>
            <Ionicons name="search" size={20} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder={t('placeLatLngPlaceholder')}
            placeholderTextColor="#888"
            value={coordText}
            onChangeText={setCoordText}
            onSubmitEditing={handleSearchCoords}
            returnKeyType="search"
          />
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ ...initialLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        onPress={handleMapPress}
      >
        {selectedLocation && <Marker coordinate={selectedLocation} />}
      </MapView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmText}>{t('confirmLocation')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  searchContainer: { position: 'absolute', top: 50, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  backButton: { backgroundColor: 'white', padding: 10, borderRadius: 20, marginRight: 10, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, height: 44, width: 44 },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  searchIconBtn: {
    marginRight: 8,
    padding: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    height: '100%',
    paddingVertical: 0,
  },
  footer: { position: 'absolute', bottom: 30, left: 20, right: 20 },
  confirmButton: { backgroundColor: '#1EAE58', padding: 15, borderRadius: 12, alignItems: 'center', elevation: 5 },
  confirmText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});