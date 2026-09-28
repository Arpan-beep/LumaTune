import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Linking,
  TextInput,
  FlatList,
  Keyboard
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { collection, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { translateAttribute } from "../utils/attributeTranslator";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { db, auth } from "../services/FirebaseConfig";
import { useLanguage } from '../context/LanguageContext';

export default function MapScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [placePhotos, setPlacePhotos] = useState([]);
  const [submitterName, setSubmitterName] = useState('');

  // Search specific states
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  useEffect(() => {
    getCurrentLocation();
    fetchPlaces();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const selectedId = route?.params?.selectedPlaceId;
      if (selectedId && places.length > 0) {
        const target = places.find(p => p.id === selectedId);
        if (target) {
          onPlaceSelect(target);
        }
      }
    }, [route?.params?.selectedPlaceId, places])
  );

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(t('permissionDenied'), t('locationPermissionMsg'));
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation.coords);
    } catch (error) {
      console.log(error);
      Alert.alert(t('error'), t('fetchLocationError'));
    }
  };

  const fetchPlaces = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "places"));
      const placesData = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.status || data.status === 'approved') {
          placesData.push({ id: docSnap.id, ...data });
        }
      });

      setPlaces(placesData);
    } catch (error) {
      console.log("Error fetching places: ", error);
      Alert.alert(t('error'), t('loadPlacesError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = async (place) => {
    setSelectedPlace(place);
    setModalVisible(true);
    setSubmitterName('');

    if (place.submittedByName) {
      setSubmitterName(place.submittedByName);
    } else if (place.submittedBy) {
      const sub = String(place.submittedBy).trim();
      if (sub.includes('@')) {
        setSubmitterName(sub.split('@')[0]);
      } else if (sub.length >= 20) {
        try {
          const userSnap = await getDoc(doc(db, "users", sub));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            setSubmitterName(uData.displayName || uData.name || uData.username || uData.email?.split('@')[0] || sub);
          } else {
            setSubmitterName(sub);
          }
        } catch (e) {
          console.log("Error fetching submitter user:", e);
          setSubmitterName(sub);
        }
      } else {
        setSubmitterName(sub);
      }
    }

    const photosList = [];
    if (place.imageUri) photosList.push(place.imageUri);
    if (Array.isArray(place.images)) {
      place.images.forEach((img) => {
        if (img && !photosList.includes(img)) photosList.push(img);
      });
    }

    try {
      const q1 = query(collection(db, "Reviews"), where("place_id", "==", place.id));
      const snap1 = await getDocs(q1);
      snap1.forEach((docSnap) => {
        const data = docSnap.data();
        if ((!data.status || data.status === 'approved') && data.imageUri && !photosList.includes(data.imageUri)) {
          photosList.push(data.imageUri);
        }
      });
    } catch (e1) {
      // Handled
      console.log('Error fetching pending Reviews:', e1);
    }

    setPlacePhotos(photosList);
  };

  const handleAddToFavorites = async (place) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t('error') || 'Error', t('loginToFavoriteMsg') || 'Please log in to add places to your favorites.');
      return;
    }

    try {
      const favRef = doc(db, "users", user.uid, "favourite_locations", place.id);
      await setDoc(favRef, {
        placeId: place.id,
        name: place.placeName,
      });
      Alert.alert(t('success') || 'Success', t('addedToFavoritesMsg') || 'Added to your favourite location list!');
    } catch (error) {
      console.error('Error adding to favourites:', error);
      Alert.alert(t('error') || 'Error', error.message);
    }
  };

  // Search Logic
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const newData = places.filter((item) => {
        const itemData = item.placeName ? item.placeName.toUpperCase() : ''.toUpperCase();
        const textData = text.toUpperCase();
        return itemData.indexOf(textData) > -1;
      });
      setFilteredPlaces(newData);
    } else {
      setFilteredPlaces([]);
    }
  };

  const onPlaceSelect = (place) => {
    if (!place) return;
    setSearchQuery('');
    setFilteredPlaces([]);
    Keyboard.dismiss();

    const lat = Number(place.latitude);
    const lng = Number(place.longitude);

    if (mapRef.current && !isNaN(lat) && !isNaN(lng)) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }, 1000);
    }

    setTimeout(() => {
      if (markerRefs.current[place.id]) {
        markerRefs.current[place.id].showCallout();
      }
    }, 600);

    handleSelectPlace(place);
  };

  const translateValue = (value, type) => {
    if (value === undefined || value === null) return t('na');
    const translatedStr = translateAttribute(value, type);
    const valLower = String(translatedStr).toLowerCase().trim();

    switch (type) {
      case 'wifi':
        if (valLower === 'weak') return t('wifiWeak');
        if (valLower === 'moderate') return t('moderate');
        if (valLower === 'strong') return t('wifiStrong');
        if (valLower === 'none') return t('outletsNone') || 'None';
        break;
      case 'sound':
        if (valLower === 'quiet' || valLower === 'quite') return t('soundQuiet');
        if (valLower === 'moderate') return t('moderate');
        if (valLower === 'loud') return t('soundLoud');
        break;
      case 'outlets':
        if (valLower === 'none') return t('outletsNone');
        if (valLower === 'some' || valLower === 'very few') return t('outletsSome') || 'Some';
        if (valLower === 'many') return t('outletsMany');
        break;
    }
    return translatedStr;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  };

  const openInGoogleMaps = (place) => {
    if (!place) return;
    const lat = place.latitude || location?.latitude || 0;
    const lng = place.longitude || location?.longitude || 0;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), t('googleMapsErrorMsg'));
    });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  if (!location) return <View />;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={false}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          title={t('youAreHere')}
          pinColor="purple"
        />

        {places.map((place) => {
          if (!place.latitude || !place.longitude) return null;

          return (
            <Marker
              key={place.id}
              ref={(ref) => {
                if (ref) markerRefs.current[place.id] = ref;
              }}
              coordinate={{
                latitude: Number(place.latitude),
                longitude: Number(place.longitude),
              }}
              title={place.placeName}
              pinColor="red"
              onPress={() => handleSelectPlace(place)}
            />
          );
        })}
      </MapView>

      {/* Search Bar Overlay */}
      <View style={[styles.searchContainer, { top: insets.top + 10 }]}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlacePlaceholder') || "Search places..."}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown List */}
        {filteredPlaces.length > 0 && (
          <View style={styles.searchResults}>
            <FlatList
              data={filteredPlaces}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => onPlaceSelect(item)}
                >
                  <Ionicons name="location-outline" size={20} color="#555" />
                  <Text style={styles.searchResultText}>{item.placeName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {selectedPlace && !modalVisible && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity style={styles.openModalButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="chevron-up" size={24} color="white" />
            <Text style={styles.openModalText}>{t('viewDetails')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedPlace && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.detailsCard, { paddingBottom: insets.bottom }]}>
              <TouchableOpacity
                style={styles.closeHandleContainer}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <View style={styles.dragHandle} />
                <Text style={styles.closeText}>{t('hideDetails')}</Text>
              </TouchableOpacity>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>{selectedPlace.placeName}</Text>
                <Text style={styles.subtitle}>
                  {t('submittedBy')} {submitterName || selectedPlace.submittedBy || t('defaultUserName')}
                  {formatTime(selectedPlace.createdAt || selectedPlace.approvedAt) ? ` | ${formatTime(selectedPlace.createdAt || selectedPlace.approvedAt)}` : ''}
                </Text>

                <View style={styles.imageGrid}>
                  <Image
                    source={{ uri: placePhotos[0] || selectedPlace.imageUri || 'https://via.placeholder.com/300' }}
                    style={styles.mainImage}
                  />
                  <View style={styles.sideImages}>
                    <Image source={{ uri: placePhotos[1] || 'https://via.placeholder.com/150' }} style={styles.smallImage} />
                    <Image source={{ uri: placePhotos[2] || 'https://via.placeholder.com/150' }} style={styles.smallImage} />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.seeMoreContainer}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('PlaceGallery', {
                      placeId: selectedPlace.id,
                      placeName: selectedPlace.placeName,
                      images: placePhotos,
                    });
                  }}
                >
                  <Text style={styles.seeMoreText}>{t('seeMorePhotos') || 'See More Photos'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#4285F4" />
                </TouchableOpacity>

                <View style={styles.featureList}>
                  {selectedPlace.isWheelchairAccessible ? (
                    <View style={styles.featureRow}>
                      <Ionicons name="body" size={24} color="#1A73E8" style={styles.icon} />
                      <Text style={[styles.featureText, { color: '#1A73E8', fontWeight: 'bold' }]}>
                        {t('wheelchairAccessibleLabel')} ♿
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.featureRow}>
                    <Feather name="check-square" size={24} color="black" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('suitableForLabel')} </Text>
                      {selectedPlace.suitableFor}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Feather name="thumbs-up" size={24} color="black" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('tranquilityRatingLabel')} </Text>
                      {selectedPlace.tranquility}/5
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="volume-medium-outline" size={24} color="black" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('soundConditionsLabel')} </Text>
                      {translateValue(selectedPlace.soundCondition, 'sound')}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Feather name="wifi" size={24} color="black" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('wifiStrengthLabel')} </Text>
                      {translateValue(selectedPlace.wifiStrength, 'wifi')}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="power-plug-outline" size={24} color="black" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('powerOutletsLabel')} </Text>
                      {translateValue(selectedPlace.powerOutlets, 'outlets')}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.featureRow} onPress={() => openInGoogleMaps(selectedPlace)}>
                    <MaterialCommunityIcons name="google-maps" size={24} color="#34A853" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('checkIn')}</Text>
                      <Text style={{ color: '#4285F4', fontWeight: 'bold' }}>G</Text>
                      <Text style={{ color: '#EA4335', fontWeight: 'bold' }}>o</Text>
                      <Text style={{ color: '#FBBC05', fontWeight: 'bold' }}>o</Text>
                      <Text style={{ color: '#4285F4', fontWeight: 'bold' }}>g</Text>
                      <Text style={{ color: '#34A853', fontWeight: 'bold' }}>l</Text>
                      <Text style={{ color: '#EA4335', fontWeight: 'bold' }}>e</Text>
                      <Text style={{ color: '#777777', fontWeight: 'bold' }}> Maps</Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.featureRow}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('ViewReviews', {
                        placeId: selectedPlace.id,
                        placeName: selectedPlace.placeName,
                      });
                    }}
                  >
                    <Ionicons name="chatbubbles-outline" size={24} color="#4285F4" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('seeReviews')}</Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.featureRow}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('ReviewScreen', {
                        placeId: selectedPlace.id,
                        placeName: selectedPlace.placeName,
                      });
                    }}
                  >
                    <Ionicons name="star-outline" size={24} color="#F29C38" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('writeReview')}</Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.featureRow}
                    onPress={() => handleAddToFavorites(selectedPlace)}
                  >
                    <Ionicons name="heart-outline" size={24} color="#E53935" style={styles.icon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.bold}>{t('addToFavorites')}</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  floatingButtonContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' },
  openModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C92AC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  openModalText: { color: 'white', fontWeight: 'bold', marginLeft: 5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  detailsCard: {
    maxHeight: '75%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1.5,
    borderColor: '#00000050',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20
  },
  closeHandleContainer: { alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dragHandle: { width: 40, height: 5, backgroundColor: '#cccccc', borderRadius: 5, marginBottom: 5 },
  closeText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', fontFamily: 'serif', color: '#000', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 20 },
  imageGrid: { flexDirection: 'row', height: 180, marginBottom: 25 },
  mainImage: { flex: 2, height: '100%', marginRight: 10, borderRadius: 10 },
  sideImages: { flex: 1, justifyContent: 'space-between' },
  smallImage: { width: '100%', height: '48%', borderRadius: 10 },
  seeMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -15,
    marginBottom: 20,
    paddingRight: 5,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 4,
  },
  featureList: { marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  icon: { marginRight: 15, width: 30, textAlign: 'center' },
  featureText: { fontSize: 16, color: '#000' },
  bold: { fontWeight: 'bold' },
  searchContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    zIndex: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontFamily: 'serif',
  },
  searchResults: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginTop: 10,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    fontFamily: 'serif',
  }
});