import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { globalStyles, COLORS } from '../styles/theme';
import { auth, db, storage } from '../services/FirebaseConfig';
import { signOut, updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import EditProfileModal from '../components/modals/EditProfileModal';
import PreferencesModal from '../components/modals/PreferencesModal';
import SettingsModal from '../components/modals/SettingsModal';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(auth.currentUser);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [userRole, setUserRole] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Profile Edit Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhotoURL, setNewPhotoURL] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Settings Modal States
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  // Dynamic Preferences States 
  const [isPrefModalVisible, setIsPrefModalVisible] = useState(false);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [isInstrumentalOnly, setIsInstrumentalOnly] = useState(false);
  const [isWheelchairAccessible, setIsWheelchairAccessible] = useState(false);

  // --- NEW: Admin Pool States & Search Inputs ---
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availableArtists, setAvailableArtists] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const [artistSearch, setArtistSearch] = useState('');

  // Playlist Count State
  const [savedPlaylistsCount, setSavedPlaylistsCount] = useState(0);

  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.displayName || '');
        setPhotoURL(currentUser.photoURL || '');
        setEmail(currentUser.email || '');
        setImageError(false);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserRole(userData.role || 'user');

            setFavoriteGenres(userData.favoriteGenres || []);
            setFavoriteArtists(userData.favoriteArtists || []);
            setIsInstrumentalOnly(userData.isInstrumentalOnly || false);
            setIsWheelchairAccessible(userData.isWheelchairAccessible || false);
          }

          await currentUser.reload();
          setDisplayName(auth.currentUser?.displayName || '');
          setPhotoURL(auth.currentUser?.photoURL || '');
        } catch (e) {
          console.log("Error reloading profile:", e);
        }
      } else {
        setUserRole(null);
      }
    });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchCount = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        try {
          const snap = await getDocs(collection(db, "users", userId, "saved_playlists"));
          setSavedPlaylistsCount(snap.docs.length);
        } catch (e) {
          console.error("Error fetching count:", e);
        }
      };
      fetchCount();
    }, [])
  );

  const uploadPicture = async () => {
    const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requestResult.status !== 'granted') {
      Alert.alert(t('alertPermissionTitle'), t('alertPermissionMsg'));
    } else {
      const imageResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (imageResult.canceled == true) {
        return;
      } else {
        setIsUpdating(true);
        try {
          const localUri = imageResult.assets[0].uri
          const response = await fetch(localUri);
          const blob = await response.blob();
          const fileRef = ref(storage, `profile_pictures/${auth.currentUser.uid}`)
          const uploadResult = await uploadBytes(fileRef, blob);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          setNewPhotoURL(downloadURL);
        } catch (error) {
          Alert.alert(t('alertErrorTitle'), error.message);
          console.log("Full Upload Error:", error);
        } finally {
          setIsUpdating(false);
        }
      }
    }
  }

  const handleUpdateProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (!newName || newName.trim() === '') {
      Alert.alert(t('alertValidationTitle'), t('alertValidationMsg'));
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile(currentUser, {
        displayName: newName,
        photoURL: newPhotoURL,
      });

      const docReference = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docReference, {
        displayName: newName,
        photoURL: newPhotoURL,
      });

      await currentUser.reload();
      setImageError(false);
      setDisplayName(newName);
      setPhotoURL(newPhotoURL);

      Alert.alert(t('alertSuccessTitle'), t('alertSuccessMsg'));
      setIsModalVisible(false);
    } catch (error) {
      Alert.alert(t('alertErrorTitle'), error.message || "Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setIsUpdating(true);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, {
        favoriteGenres,
        favoriteArtists,
        isInstrumentalOnly,
        isWheelchairAccessible
      });
      setIsPrefModalVisible(false);
    } catch (error) {
      Alert.alert(t('alertErrorTitle') || 'Error', error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- NEW: Fetch Admin Music Pool ---
  const fetchAdminMusicPool = async () => {
    try {
      // Load Genres
      const genresSnap = await getDocs(collection(db, "genres"));
      const genreList = genresSnap.docs.map(d => {
        const data = d.data();
        return language === 'pt' 
          ? (data.label_pt || data.label_en || data.name || d.id)
          : (data.label_en || data.label_pt || data.name || d.id);
      });
      setAvailableGenres(genreList);
  
      // Load Artists
      const artistsSnap = await getDocs(collection(db, "artists"));
      const artistList = artistsSnap.docs.map(d => d.data().name || d.id);
      setAvailableArtists(artistList);
    } catch (error) {
      console.error("Error fetching admin music pool:", error);
    }
  };

  // --- NEW: Handle Selections ---
  const handleSelectGenre = (genre) => {
    if (!favoriteGenres.includes(genre)) {
      setFavoriteGenres(prev => [...prev, genre]);
    }
    setGenreSearch('');
  };
  
  const handleSelectArtist = (artist) => {
    if (!favoriteArtists.includes(artist)) {
      setFavoriteArtists(prev => [...prev, artist]);
    }
    setArtistSearch('');
  };

  const handleRemoveGenre = (genreToRemove) => {
    setFavoriteGenres(prev => prev.filter(g => g !== genreToRemove));
  };

  const handleRemoveArtist = (artistToRemove) => {
    setFavoriteArtists(prev => prev.filter(a => a !== artistToRemove));
  };

  const handleLogout = () => {
    Alert.alert(t('alertLogoutTitle'), t('alertLogoutMsg'), [
      { text: t('cancelButton'), style: "cancel" },
      { text: t('logout'), onPress: () => signOut(auth), style: "destructive" }
    ]);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'pt' : 'en');
  };

  return (
    <SafeAreaView style={globalStyles.screenContainer}>
      <ScrollView contentContainerStyle={globalStyles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.headerContainer}>
          <View style={styles.profileAvatar}>
            {photoURL && !imageError ? (
              <Image
                source={{ uri: photoURL }}
                style={styles.avatarImage}
                onError={() => setImageError(true)}
              />
            ) : (
              <Text style={styles.avatarPlaceholder}>👤</Text>
            )}
          </View>
          <Text style={styles.userName}>{displayName || t('defaultUserName')}</Text>
          <Text style={styles.userEmail}>{email || t('noEmailLinked')}</Text>
        </View>

        {/* Admin Section */}
        {userRole === 'admin' && (
          <View style={globalStyles.sectionContainer}>
            <Text style={globalStyles.sectionTitle}>{t('adminSection')}</Text>

            <TouchableOpacity style={globalStyles.listItem}
              onPress={() => navigation.navigate('AdminScreen')}
            >
              <View style={[globalStyles.listItemIconBox, { backgroundColor: '#FFF3E0' }]}>
                <Text>⏳</Text>
              </View>
              <View style={globalStyles.listItemTextContainer}>
                <Text style={globalStyles.listItemTitle}>{t('pendingLocation')}</Text>
              </View>
              <Text style={globalStyles.listItemChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={globalStyles.listItem}
              onPress={() => navigation.navigate('AdminEditPlacesScreen')}
            >
              <View style={[globalStyles.listItemIconBox, { backgroundColor: '#E1BEE7' }]}>
                <Text>📝</Text>
              </View>
              <View style={globalStyles.listItemTextContainer}>
                <Text style={globalStyles.listItemTitle}>{t('editPlaces')}</Text>
              </View>
              <Text style={globalStyles.listItemChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={globalStyles.listItem}
              onPress={() => navigation.navigate('AdminEditOptionsScreen')}
            >
              <View style={[globalStyles.listItemIconBox, { backgroundColor: '#D1C4E9' }]}>
                <Text>⚙️</Text>
              </View>
              <View style={globalStyles.listItemTextContainer}>
                <Text style={globalStyles.listItemTitle}>{t('editOptions')}</Text>
              </View>
              <Text style={globalStyles.listItemChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* My Collection Section */}
        <View style={globalStyles.sectionContainer}>
          <Text style={globalStyles.sectionTitle}>{t('myCollectionSection')}</Text>

          <TouchableOpacity
            style={globalStyles.listItem}
            onPress={() => navigation.navigate('SavedPlaylistsScreen')}
          >
            <View style={[globalStyles.listItemIconBox, { backgroundColor: '#E8F0FE' }]}>
              <Text>🎵</Text>
            </View>
            <View style={globalStyles.listItemTextContainer}>
              <Text style={globalStyles.listItemTitle}>{t('savedPlaylists')}</Text>
              <Text style={globalStyles.listItemSubtitle}>
                {savedPlaylistsCount} {savedPlaylistsCount === 1 ? t('item') : t('items')}
              </Text>
            </View>
            <Text style={globalStyles.listItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={globalStyles.listItem}
            onPress={() => navigation.navigate('FavoriteLocations')}
          >
            <View style={[globalStyles.listItemIconBox, { backgroundColor: '#FFEBEE' }]}>
              <Text>❤️</Text>
            </View>
            <View style={globalStyles.listItemTextContainer}>
              <Text style={globalStyles.listItemTitle}>{t('favouriteLocationsTitle')}</Text>
            </View>
            <Text style={globalStyles.listItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={globalStyles.sectionContainer}>
          <Text style={globalStyles.sectionTitle}>{t('accountSection')}</Text>

          <TouchableOpacity
            style={globalStyles.listItem}
            onPress={() => {
              setNewName(displayName);
              setNewPhotoURL(photoURL);
              setIsModalVisible(true);
            }}
          >
            <View style={[globalStyles.listItemIconBox, { backgroundColor: '#F8F9FA' }]}>
              <Text>✏️</Text>
            </View>
            <View style={globalStyles.listItemTextContainer}>
              <Text style={globalStyles.listItemTitle}>{t('editProfile')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={globalStyles.listItem}
            onPress={() => {
              fetchAdminMusicPool();
              setIsPrefModalVisible(true);
            }}
          >
            <View style={[globalStyles.listItemIconBox, { backgroundColor: '#F8F9FA' }]}>
              <Text>🎧</Text>
            </View>
            <View style={globalStyles.listItemTextContainer}>
              <Text style={globalStyles.listItemTitle}>{t('preferencesTitle')}</Text>
            </View>
            <Text style={globalStyles.listItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={globalStyles.listItem}
            onPress={() => setIsSettingsModalVisible(true)}
          >
            <View style={[globalStyles.listItemIconBox, { backgroundColor: '#F8F9FA' }]}>
              <Text>⚙️</Text>
            </View>
            <View style={globalStyles.listItemTextContainer}>
              <Text style={globalStyles.listItemTitle}>{t('settings')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={globalStyles.listItem} onPress={handleLogout}>
            <View style={[globalStyles.listItemIconBox, { backgroundColor: '#F8F9FA' }]}>
              <Text>🚪</Text>
            </View>
            <View style={globalStyles.listItemTextContainer}>
              <Text style={[globalStyles.listItemTitle, { color: COLORS.accent }]}>{t('logout')}</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Extracted Modular Modals */}
      <EditProfileModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        newName={newName}
        setNewName={setNewName}
        onUploadPicture={uploadPicture}
        onSave={handleUpdateProfile}
        isUpdating={isUpdating}
      />

      <PreferencesModal
        visible={isPrefModalVisible}
        onClose={() => setIsPrefModalVisible(false)}
        favoriteGenres={favoriteGenres}
        onSelectGenre={handleSelectGenre}
        onRemoveGenre={handleRemoveGenre}
        availableGenres={availableGenres}
        favoriteArtists={favoriteArtists}
        onSelectArtist={handleSelectArtist}
        onRemoveArtist={handleRemoveArtist}
        availableArtists={availableArtists}
        isInstrumentalOnly={isInstrumentalOnly}
        setIsInstrumentalOnly={setIsInstrumentalOnly}
        isWheelchairAccessible={isWheelchairAccessible}
        setIsWheelchairAccessible={setIsWheelchairAccessible}
        onSave={handleSavePreferences}
        isUpdating={isUpdating}
      />

      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        language={language}
        onToggleLanguage={toggleLanguage}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    fontSize: 40,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});

export default HomeScreen;