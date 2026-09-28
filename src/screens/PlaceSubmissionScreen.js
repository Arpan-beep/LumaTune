import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, ActivityIndicator, Switch } from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { globalStyles, COLORS } from '../styles/theme';
import CustomDropdown from '../components/CustomDropdown';
import { db, auth, storage } from '../services/FirebaseConfig';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLanguage } from '../context/LanguageContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons } from '@expo/vector-icons';
import { getWifiLabel, getSoundLabel, getOutletsLabel } from '../utils/attributeTranslator';

export default function PlaceSubmissionScreen({ navigation, route }) {
  const { t, language } = useLanguage();
  const [userId, setUserId] = useState(auth.currentUser?.uid);
  const [placeName, setPlaceName] = useState('');
  const [placeType, setPlaceType] = useState('');
  const [placeTypeData, setPlaceTypeData] = useState([]);
  const [loadingPlaceTypes, setLoadingPlaceTypes] = useState(true);
  const [suitableFor, setSuitableFor] = useState('');
  const [tranquility, setTranquility] = useState(0);
  const [wifiVal, setWifiVal] = useState(0);
  const [soundVal, setSoundVal] = useState(0);
  const [outletsVal, setOutletsVal] = useState(0);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [isWheelchairAccessible, setIsWheelchairAccessible] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [uploading, setUploading] = useState(false);

  const suitableForData = [
    { label: t('suitableRelaxing'), value: 'relaxing' },
    { label: t('suitableStudying'), value: 'studying' },
    { label: t('suitableWorking'), value: 'working' },
    { label: t('suitableExercise'), value: 'exercise' },

  ];

  const openTimeData = [{ label: '08:00 AM', value: '08:00 AM' }, { label: '09:00 AM', value: '09:00 AM' }];
  const closeTimeData = [{ label: '06:00 PM', value: '06:00 PM' }, { label: '10:00 PM', value: '10:00 PM' }];

  useEffect(() => {
    if (route.params?.selectedLocation) {
      setLocation(route.params.selectedLocation);
    }
  }, [route.params?.selectedLocation]);

  // Fetch Place Types dynamically from 'place_types' root collection in Firestore
  useEffect(() => {
    const fetchPlaceTypes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'place_types'));
        const list = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const itemLabel = language === 'pt'
            ? (data.label_pt || data.label || data.name || data.title || data.label_en || doc.id)
            : (data.label_en || data.label || data.name || data.title || data.label_pt || doc.id);
          const itemValue = data.value || data.name || doc.id;
          return {
            label: itemLabel,
            value: itemValue,
          };
        });
        setPlaceTypeData(list);
      } catch (error) {
        console.error('Error fetching place types from Firestore:', error);
        setPlaceTypeData([]);
      } finally {
        setLoadingPlaceTypes(false);
      }
    };

    fetchPlaceTypes();
  }, [language]);

  const pickImage = async () => {
    const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requestResult.status !== 'granted') {
      Alert.alert(t('alertPermissionTitle'), t('alertPermissionMsg'));
    } else {
      const imageResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
      if (imageResult.canceled == true) {
        return;
      } else {
        setUploading(true);
        try {
          const localUri = imageResult.assets[0].uri;
          const response = await fetch(localUri);
          const blob = await response.blob();
          const fileRef = ref(storage, `place_images/${userId}_${Date.now()}`);
          const uploadResult = await uploadBytes(fileRef, blob);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          setImageUri(downloadURL);
        } catch (error) {
          Alert.alert(t('alertErrorTitle'), error.message);
          console.log("Full Upload Error:", error);
        } finally {
          setUploading(false);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!placeName) { Alert.alert(t('error'), t('enterPlaceNameMsg')); return; }
    try {
      await addDoc(collection(db, 'places'), {
        placeName,
        placeType,
        suitableFor,
        tranquility,
        wifiStrength: wifiVal,
        soundCondition: soundVal,
        powerOutlets: outletsVal,
        openTime,
        closeTime,
        imageUri,
        isWheelchairAccessible,
        latitude: location ? location.latitude : 41.8058,
        longitude: location ? location.longitude : -6.7572,
        status: 'pending',
        createdAt: serverTimestamp(),
        submittedBy: auth.currentUser?.uid,
        submittedByName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User'
      });
      Alert.alert(t('success'), t('placeSubmittedMsg'));
      setPlaceName(''); setPlaceType(''); setSuitableFor(''); setTranquility(0); setWifiVal(0); setSoundVal(0); setOutletsVal(0); setOpenTime(''); setCloseTime(''); setImageUri(null); setIsWheelchairAccessible(false);
    } catch (error) {
      Alert.alert(t('error'), t('savePlaceErrorMsg'));
    }
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('newPlaceSubmission')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={[globalStyles.formContainer, styles.formContainer]} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.formContent}>
          <TouchableOpacity style={styles.mapPlaceholder} activeOpacity={0.8} onPress={() => navigation.navigate('MapSelectionScreen', { currentLocation: location })}>
            {location ? (
              <MapView style={StyleSheet.absoluteFillObject} provider={PROVIDER_GOOGLE} initialRegion={{ ...location, latitudeDelta: 0.005, longitudeDelta: 0.005 }} scrollEnabled={false} zoomEnabled={false} pointerEvents="none">
                <Marker coordinate={location} />
              </MapView>
            ) : (<Text style={styles.mapText}>{t('tapToAddLocation')}</Text>)}
          </TouchableOpacity>

          <Text style={styles.label}>{t('placeNameLabel')}</Text>
          <TextInput style={[globalStyles.input, styles.input]} placeholder={t('enterNamePlaceholder')} placeholderTextColor={COLORS.placeholder} value={placeName} onChangeText={setPlaceName} />

          {/* Place Type Section fetched from place_types root collection */}
          <Text style={styles.label}>{t('placeTypeLabel') || 'Place Type'}</Text>
          <CustomDropdown
            data={placeTypeData}
            value={placeType}
            setValue={setPlaceType}
            placeholder={loadingPlaceTypes ? (t('loading') || 'Loading...') : (t('selectPlaceType') || 'Select Place Type')}
          />

          <Text style={styles.label}>{t('suitableForLabel')}</Text>
          <CustomDropdown data={suitableForData} value={suitableFor} setValue={setSuitableFor} placeholder={t('selectMatchingOptions')} />

          {/* Tranquility Rating */}
          <Text style={styles.label}>{t('tranquilityRatingLabel')}</Text>
          <View style={styles.starRatingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                activeOpacity={0.7}
                onPress={() => setTranquility(star)}
                style={styles.starTouch}
              >
                <Ionicons
                  name={star <= tranquility ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= tranquility ? '#F29C38' : '#CCCCCC'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* WiFi Strength Slider */}
          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sliderLabel}>{t('wifiStrengthLabel')}</Text>
            <Text style={styles.dynamicValueText}>{wifiVal} - {getWifiLabel(wifiVal)}</Text>
          </View>
          <Slider
            containerStyle={styles.slider}
            minimumValue={0}
            maximumValue={3}
            step={0.5}
            value={wifiVal}
            onValueChange={(val) => setWifiVal(Array.isArray(val) ? val[0] : val)}
            minimumTrackTintColor="#F4A261"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#e0e0e0ff"
            trackStyle={styles.sliderTrack}
            thumbStyle={styles.sliderThumb}
          />

          {/* Sound Conditions Slider */}
          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sliderLabel}>{t('soundConditionsLabel')}</Text>
            <Text style={styles.dynamicValueText}>{soundVal} - {getSoundLabel(soundVal)}</Text>
          </View>
          <Slider
            containerStyle={styles.slider}
            minimumValue={0}
            maximumValue={3}
            step={0.5}
            value={soundVal}
            onValueChange={(val) => setSoundVal(Array.isArray(val) ? val[0] : val)}
            minimumTrackTintColor="#F4A261"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#e0e0e0ff"
            trackStyle={styles.sliderTrack}
            thumbStyle={styles.sliderThumb}
          />

          {/* Power Outlets Slider */}
          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sliderLabel}>{t('powerOutletsLabel')}</Text>
            <Text style={styles.dynamicValueText}>{outletsVal} - {getOutletsLabel(outletsVal)}</Text>
          </View>
          <Slider
            containerStyle={styles.slider}
            minimumValue={0}
            maximumValue={3}
            step={0.5}
            value={outletsVal}
            onValueChange={(val) => setOutletsVal(Array.isArray(val) ? val[0] : val)}
            minimumTrackTintColor="#F4A261"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#e0e0e0ff"
            trackStyle={styles.sliderTrack}
            thumbStyle={styles.sliderThumb}
          />

          <Text style={styles.label}>{t('openCloseTimeLabel')}</Text>
          <View style={styles.timeRow}>
            <CustomDropdown
              data={openTimeData}
              value={openTime}
              setValue={setOpenTime}
              placeholder={t('selectOpenTime')}
              containerStyle={styles.timePicker}
              dropdownStyle={styles.timeDropdown}
              placeholderStyle={styles.timePlaceholder}
            />
            <CustomDropdown
              data={closeTimeData}
              value={closeTime}
              setValue={setCloseTime}
              placeholder={t('selectCloseTime')}
              containerStyle={styles.timePicker}
              dropdownStyle={styles.timeDropdown}
              placeholderStyle={styles.timePlaceholder}
            />
          </View>

          {/* Wheelchair Accessibility Switch */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.label}>{t('wheelchairAccessibleLabel')}</Text>
              <Text style={styles.subLabel}>{t('wheelchairAccessibleDesc')}</Text>
            </View>
            <Switch
              value={isWheelchairAccessible}
              onValueChange={setIsWheelchairAccessible}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          {/* Photo Upload Section */}
          <View style={styles.section}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={26} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.photoButtonText}>{t('addPhoto') || 'Add Photo'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={[globalStyles.primaryButton, styles.submitButton]} onPress={handleSubmit}>
            <Text style={globalStyles.buttonText}>{t('submit')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#F9F9F9' },
  backButton: { padding: 5 },
  backIcon: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: '400', fontFamily: 'serif' },
  formContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, marginHorizontal: 0, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 15 },
  formContent: { paddingHorizontal: 20 },
  mapPlaceholder: { height: 140, backgroundColor: COLORS.border, borderRadius: 16, marginTop: 15, marginBottom: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mapText: { color: '#888' },
  label: { fontSize: 16, fontFamily: 'serif', marginBottom: 8, marginTop: 10, color: COLORS.textDark },
  starRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  starTouch: {
    paddingRight: 10,
  },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: COLORS.white },

  // New Styles for cleaner slider headers
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 15,
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 16,
    fontFamily: 'serif',
    color: COLORS.textDark
  },
  dynamicValueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary || '#4285F4',
    fontFamily: 'serif',
  },

  slider: { width: '100%', height: 40, justifyContent: 'center' },
  sliderTrack: { height: 10, borderRadius: 5 },
  sliderThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 12 },
  sliderLabelText: { fontSize: 13, color: '#555' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timePicker: { flex: 0.48 },
  timeDropdown: { minHeight: 56, paddingVertical: 8, justifyContent: 'center' },
  timePlaceholder: { fontSize: 13 },
  section: {
    marginBottom: 18,
  },
  photoButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    flexDirection: 'row',
  },
  photoButtonText: {
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.primary,
    fontFamily: 'serif',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  submitButton: { width: '100%', borderRadius: 14, paddingVertical: 16, marginTop: 5, marginBottom: 20 },
});