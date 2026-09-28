import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, FlatList, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/FirebaseConfig';
import getYoutubePlaylists from '../services/YoutubeService';
import { useLanguage } from '../context/LanguageContext';

const ACTIVITY_KEYWORDS = {
  work_study: ['work', 'study', 'studying', 'working'],
  relax: ['relax', 'relaxing'],
  exercise: ['workout','run', 'exercise', 'active'],
};

const getMinTranquilityForMood = (mood) => {
  if (mood <= 0.33) return 4;
  if (mood <= 0.66) return 3;
  return 0;
};

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some((v) => v === undefined || v === null)) return null;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function RecommendationScreen({ navigation, route }) {
    const { 
      mood = 0.5, 
      activity = null, 
      soundPreference = null, 
      needPower = null, 
      needWifi = null, 
      note = '',
      cachedPlaylists = null, 
      journalId = null
    } = route.params || {};

  const { language,t } = useLanguage();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  const getMoodLabel = (moodVal) => {
    if (moodVal <= 0.20) return t('moodVeryLow');      
    if (moodVal <= 0.40) return t('moodLow');          
    if (moodVal <= 0.60) return t('moodNeutral');      
    if (moodVal <= 0.80) return t('moodGood');         
    return t('moodVeryHappy');                         
  };

  useEffect(() => {
    const fetchMusic = async () => {
      // --- STEP 1: Check for Cached Playlists first ---
      if (cachedPlaylists && cachedPlaylists.length > 0) {
        setPlaylists(cachedPlaylists); 
        setPlaylistsLoading(false);
        return; 
      }

      const userId = auth.currentUser?.uid;
      let userPreferences = {};
      let recentEntries = [];

      if (userId) {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) userPreferences = userSnap.data();

        // 2. Fetch Last 5 Journal Logs
        const histQuery = query(collection(db, "users", userId, "Journal"), orderBy("createdAt", "desc"), limit(5));
        const histSnap = await getDocs(histQuery);
        recentEntries = histSnap.docs.map(d => d.data());
      }

      setPlaylistsLoading(true);
      try {
        const results = await getYoutubePlaylists(mood, activity, {
          language,
          note,
          recentEntries,
          favoriteGenres: userPreferences.favoriteGenres || [],
          favoriteArtists: userPreferences.favoriteArtists || [],
          isInstrumentalOnly: userPreferences.isInstrumentalOnly || false,
        });
        
        setPlaylists(results || []);

        // --- STEP 2: Save to Firestore after generating ---
        if (journalId && userId && results && results.length > 0) {
          await updateDoc(doc(db, "users", userId, "Journal", journalId), {
            playlists: results
          });
        }

      } catch (error) {
        console.error('Error fetching music:', error);
      } finally {
        setPlaylistsLoading(false);
      }
    };
    
    fetchMusic();
  }, [mood, activity, cachedPlaylists, journalId]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (err) {
        console.log('Location unavailable:', err);
      }
    })();
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [userLocation]);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'places'));
      let data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p) => !p.status || p.status === 'approved');

      // 1. Flexible Activity Keyword Matching
      if (activity) {
        const keywords = ACTIVITY_KEYWORDS[activity] || [activity];
        data = data.filter((p) => {
          if (!p.suitableFor) return true;
          const suitableStr = String(p.suitableFor).toLowerCase();
          return keywords.some((k) => suitableStr.includes(k.toLowerCase()) || k.toLowerCase().includes(suitableStr));
        });
      }

      // 2. Numeric Tranquility Calibration
      const minTranquility = getMinTranquilityForMood(mood);
      data = data.filter((p) => (Number(p.tranquility) || 0) >= minTranquility);

      // 3. Numeric Sound Condition Threshold
      if (soundPreference && soundPreference !== 'Any' && soundPreference !== 'None') {
        data = data.filter(p => {
          if (p.soundCondition === undefined || p.soundCondition === null) return true;
          const val = Number(p.soundCondition);
          if (isNaN(val)) return p.soundCondition === soundPreference;
          if (soundPreference === 'Quiet') return val >= 2.0;
          if (soundPreference === 'Moderate') return val >= 1.5;
          return true;
        });
      }

      // 4. Numeric Power Outlets Threshold
      if (needPower && needPower !== 'None') {
        data = data.filter(p => {
          if (p.powerOutlets === undefined || p.powerOutlets === null) return true;
          const val = Number(p.powerOutlets);
          if (isNaN(val)) return p.powerOutlets === needPower;
          if (needPower === 'Many') return val >= 2.0;
          if (needPower === 'Some') return val >= 0.5;
          return true;
        });
      }

      // 5. Numeric Wi-Fi Strength Threshold
      if (needWifi && needWifi !== 'No' && needWifi !== 'None') {
        data = data.filter(p => {
          if (p.wifiStrength === undefined || p.wifiStrength === null) return true;
          const val = Number(p.wifiStrength);
          if (isNaN(val)) return p.wifiStrength === needWifi;
          if (needWifi === 'Strong') return val >= 2.5;
          if (needWifi === 'Moderate') return val >= 1.5;
          return true;
        });
      }

      // 5.5. Wheelchair Accessibility Preference
      if (auth.currentUser?.uid) {
        try {
          const userDocSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDocSnap.exists() && userDocSnap.data().isWheelchairAccessible) {
            data = data.filter(p => p.isWheelchairAccessible === true);
          }
        } catch (e) {
          console.log("Error checking wheelchair preference:", e);
        }
      }

      // 6. Calculate distance for available GPS location
      data = data.map((p) => ({
        ...p,
        distanceKm: userLocation ? getDistanceKm(userLocation.latitude, userLocation.longitude, Number(p.latitude), Number(p.longitude)) : null
      }));

      const RADII_KM = [5, 15, 50];
      let recommendedPlaces = [];

      // If GPS location is available, loop through expanding radii:
      if (userLocation) {
        for (const radius of RADII_KM) {
          const placesInRadius = data.filter(p => p.distanceKm !== null && p.distanceKm <= radius);
          if (placesInRadius.length > 0) {
            recommendedPlaces = placesInRadius;
            break; // Found places! Stop expanding.
          }
        }
      } else {
        // If GPS is disabled, show all filtered places
        recommendedPlaces = data;
      }

      recommendedPlaces.sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
        return (Number(b.tranquility) || 0) - (Number(a.tranquility) || 0);
      });

      // Limit suggested places to top 5
      setPlaces(recommendedPlaces.slice(0, 5));
    } catch (error) {
      console.error('Error fetching places:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Save Playlist Function ---
  const handleSavePlaylist = async (playlist) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert(t('error') || 'Error', t('userNotLoggedInMsg') || 'User must be logged in!');
      return;
    }

    try {
      // Using setDoc to prevent saving the same playlist duplicate times
      const playlistRef = doc(db, "users", userId, "saved_playlists", playlist.id);
      await setDoc(playlistRef, {
        id: playlist.id,
        title: playlist.title,
        thumbnail: playlist.thumbnail,
        channelTitle: playlist.channelTitle,
        savedAt: serverTimestamp(),
      });
      Alert.alert(t('success') || 'Success', t('playlistSavedSuccess') || 'Playlist saved to your collection! ❤️');
    } catch (error) {
      console.error("Error saving playlist:", error);
    }
  };

  const handleViewInMap = (item) => {
    navigation.navigate('Main', {
      screen: 'Map',
      params: { selectedPlaceId: item.id },
    });
  };

  const renderPlaceCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.placeCard} 
      activeOpacity={0.85} 
      onPress={() => handleViewInMap(item)}
    >
      <Image source={{ uri: item.imageUri }} style={styles.placeImage} />
      <View style={styles.placeInfo}>
        <Text style={styles.placeTitle} numberOfLines={1}>
          {item.placeName} {item.isWheelchairAccessible ? '♿' : ''}
        </Text>
        <Text style={styles.placeSubText}>
          {item.distanceKm != null ? `${item.distanceKm.toFixed(1)}km ${t('away')}` : t('distanceUnavailable')}
        </Text>
        <Text style={styles.placeSubText}>
          <Text style={styles.bold}>{t('tranquillity')}</Text> {item.tranquility != null ? `${item.tranquility}/5` : t('na')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-circle-outline" size={36} color="black" />
        </TouchableOpacity>

        <View style={styles.mainCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.mainHeading}>{t('yourMoodIs')}{getMoodLabel(mood)}</Text>
            <TouchableOpacity style={styles.changeMoodBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.changeMoodText}>{t('changeMoodBtn')}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionHeading}>{t('tuneInSection')}</Text>
            {playlistsLoading ? (
              <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : playlists.length === 0 ? (
              <Text style={styles.placeSubText}>{t('noPlaylistsFound')}</Text>
            ) : (
              playlists.map((playlist) => (
              <TouchableOpacity key={playlist.id} style={styles.playlistCard} onPress={() => Linking.openURL(`https://music.youtube.com/playlist?list=${playlist.id}`)}>
                <Image source={{ uri: playlist.thumbnail }} style={styles.playlistImage} />
                
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistTitle} numberOfLines={2}>{playlist.title}</Text>
                  <Text style={styles.playlistCreator}>{t('by')}{playlist.channelTitle}</Text>
                  
                  {/* --- NEW: Save Button --- */}
                  <TouchableOpacity 
                    style={styles.savePlaylistButton} 
                    onPress={() => handleSavePlaylist(playlist)}
                  >
                    <Text style={styles.savePlaylistButtonText}>❤️ {t('savePlaylistBtn') || 'Save'}</Text>
                  </TouchableOpacity>
                </View>

              </TouchableOpacity>
            )))}
              
            <Text style={styles.sectionHeading}>{t('suggestedPlacesSection')}</Text>
            {loading ? (
              <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : places.length === 0 ? (
              <Text style={styles.placeSubText}>{t('noMatchingPlaces')}</Text>
            ) : (
              <FlatList data={places} keyExtractor={(item) => item.id} renderItem={renderPlaceCard} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placesListContainer} />
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F2' },
  container: { flex: 1, backgroundColor: '#F2F2F2', paddingTop: 10 },
  backButton: { marginLeft: 20, marginBottom: 10 },
  mainCard: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 15, borderTopRightRadius: 15, borderWidth: 1, borderColor: '#E0E0E0', marginHorizontal: 10, overflow: 'hidden' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  mainHeading: { fontSize: 28, fontFamily: 'serif', color: '#000', marginBottom: 10 },
  changeMoodBtn: { backgroundColor: '#AEEEEE', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginBottom: 30 },
  changeMoodText: { color: '#000', fontSize: 14 },
  sectionHeading: { fontSize: 24, fontFamily: 'serif', color: '#000', marginBottom: 15 },
  musicCard: { backgroundColor: '#C8F4F9', borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  musicLeftCol: { flex: 1, justifyContent: 'center' },
  musicTitle: { fontSize: 18, fontFamily: 'serif', color: '#000', marginBottom: 15 },
  spotifyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#95B3F9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10, alignSelf: 'flex-start' },
  spotifyBtnText: { color: '#000', fontSize: 14 },
  journalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#A6C4F9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  journalBtnText: { color: '#000', fontSize: 14 },
  btnIcon: { marginRight: 8 },
  musicImage: { width: 90, height: 90, borderRadius: 10, marginLeft: 15 },
  placesListContainer: { paddingRight: 20 },
  placeCard: { backgroundColor: '#C8F4F9', borderRadius: 15, width: 200, marginRight: 12, overflow: 'hidden' },
  placeImage: { width: '100%', height: 95 },
  placeInfo: { padding: 10 },
  placeTitle: { fontSize: 15, fontFamily: 'serif', color: '#000', marginBottom: 4, fontWeight: 'bold' },
  placeSubText: { fontSize: 12, color: '#555', marginBottom: 2 },
  bold: { fontWeight: 'bold', color: '#000' },
  playlistCard: { backgroundColor: '#C8F4F9', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  playlistImage: { width: 80, height: 80, borderRadius: 10, marginRight: 15 },
  playlistInfo: { flex: 1, justifyContent: 'center' },
  playlistTitle: { fontSize: 16, fontFamily: 'serif', color: '#000', fontWeight: 'bold', marginBottom: 5 },
  playlistCreator: { fontSize: 13, color: '#555' },
  
  // --- NEW: Save Playlist Button Styles ---
  savePlaylistButton: {
    marginTop: 8,
    backgroundColor: '#FFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#95B3F9'
  },
  savePlaylistButtonText: {
    fontSize: 12,
    color: '#000',
    fontWeight: 'bold'
  }
});