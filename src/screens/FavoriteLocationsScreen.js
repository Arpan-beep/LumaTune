import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/FirebaseConfig';
import { useLanguage } from '../context/LanguageContext';

export default function FavoriteLocationsScreen({ navigation }) {
  const { t } = useLanguage();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFavoriteLocations();
  }, []);

  const fetchFavoriteLocations = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Check subcollection favourite_locations (or favourite_places)
      let collName = 'favourite_locations';
      let snapshot = await getDocs(collection(db, 'users', userId, collName));
      
      if (snapshot.empty) {
        collName = 'favourite_places';
        snapshot = await getDocs(collection(db, 'users', userId, collName));
      }

      // Track the favorite document ID and collection name for deletion
      const favItems = snapshot.docs.map(docSnap => ({
        favDocId: docSnap.id,
        collName: collName,
        ...docSnap.data()
      }));

      // Fetch full place details from root collection places for each favorite
      const fullPlaces = await Promise.all(
        favItems.map(async (fav) => {
          const targetId = fav.placeId || fav.favDocId; // targetId is the place ID
          try {
            const placeSnap = await getDoc(doc(db, 'places', targetId));
            if (placeSnap.exists()) {
              return { 
                id: placeSnap.id, 
                placeId: placeSnap.id, 
                favDocId: fav.favDocId, 
                collName: fav.collName, 
                ...placeSnap.data() 
              };
            }
          } catch (e) {
            console.log('Error fetching favorite place detail:', e);
          }
          return { 
            id: targetId, 
            placeId: targetId, 
            favDocId: fav.favDocId, 
            collName: fav.collName, 
            placeName: fav.name || 'Favorite Place' 
          };
        })
      );

      setFavorites(fullPlaces.filter(Boolean));
    } catch (error) {
      console.error('Error fetching favorite locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = (item) => {
    Alert.alert(
      t('removeFavoriteTitle'),
      t('removeFavoriteMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            try {
              // Delete the document from the user's specific subcollection
              await deleteDoc(doc(db, 'users', userId, item.collName, item.favDocId));
              
              // Instantly remove it from the screen without needing to reload from the database
              setFavorites((prev) => prev.filter((fav) => fav.favDocId !== item.favDocId));
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert(t('error'), t('deleteErrorMsg') || 'Could not remove this location. Please try again.');
            }
          },
        },
      ]
    );
  };

  const filteredFavorites = favorites.filter((item) => {
    const name = item.placeName || item.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePlacePress = (item) => {
    navigation.navigate('Main', {
      screen: 'Map',
      params: { selectedPlaceId: item.placeId || item.id },
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => handlePlacePress(item)}
    >
      <Image
        source={{ uri: item.imageUri || 'https://via.placeholder.com/150' }}
        style={styles.cardImage}
      />
      <View style={styles.cardInfo}>
        <View style={styles.cardInfoTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.placeName || item.name}
          </Text>
          {/* Trash Bin Icon */}
          <TouchableOpacity 
            onPress={() => handleRemoveFavorite(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#EA4335" />
          </TouchableOpacity>
        </View>

        {item.suitableFor ? (
          <Text style={styles.cardSubText} numberOfLines={1}>
            <Text style={styles.bold}>{t('suitableForLabel')} </Text>
            {item.suitableFor}
          </Text>
        ) : null}

        {item.tranquility != null ? (
          <Text style={styles.cardSubText}>
            <Text style={styles.bold}>{t('tranquilityRatingLabel')} </Text>
            {item.tranquility}/5
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Ionicons name="map-outline" size={14} color="#6200EE" style={{ marginRight: 4 }} />
          <Text style={styles.cardFooterText}>{t('viewOnMap')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-circle-outline" size={36} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('favouriteLocationsTitle')}</Text>
        </View>

        {/* Search Filter Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchFavoriteLocations')}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List Content */}
        {loading ? (
          <ActivityIndicator size="large" color="#6200EE" style={{ marginTop: 40 }} />
        ) : filteredFavorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-dislike-outline" size={48} color="#AAA" />
            <Text style={styles.emptyText}>
              {searchQuery ? t('noMatchingPlaces') : t('noFavouriteLocationsSaved')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredFavorites}
            keyExtractor={(item) => item.favDocId} // Using unique subcollection doc ID as key
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backBtn: { marginRight: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', fontFamily: 'serif', color: '#000' },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#000' },
  listContainer: { paddingBottom: 30 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImage: { width: 85, height: 85, borderRadius: 10, marginRight: 12 },
  cardInfo: { flex: 1, justifyContent: 'space-between' },
  
  // Updated header for card to hold title and trash bin side-by-side
  cardInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  cardTitle: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: 'bold', 
    fontFamily: 'serif', 
    color: '#000',
    marginRight: 10,
  },

  cardSubText: { fontSize: 12, color: '#555' },
  bold: { fontWeight: 'bold', color: '#333' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardFooterText: { fontSize: 12, color: '#6200EE', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 14, color: '#777', marginTop: 10 },
});