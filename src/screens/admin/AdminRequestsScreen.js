import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // <-- Changed import here
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../services/FirebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminScreen({ navigation }) {
  const { userRole } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole !== 'admin') return;

    setLoading(true);
    
    // 1. Build the query
    const q = query(collection(db, 'places'), where('status', '==', 'pending'));
    
    // 2. Set up the real-time listener
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const pendingData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequests(pendingData);
        setLoading(false); // Stop loader as soon as data streams in
      }, 
      (error) => {
        console.error("Error listening to requests: ", error);
        setLoading(false);
      }
    );

    // 3. Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [userRole]);

  const formatTime = (timestamp) => {
    if (!timestamp) return t('unknownTime');
    const date = timestamp.toDate();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AdminDetailScreen', { placeData: item })}
    >
      <Image source={{ uri: item.imageUri || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.title} numberOfLines={1}>{item.placeName}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {t('submittedBy')}{item.submittedBy || t('defaultUserName')} | {formatTime(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (userRole !== 'admin') {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="lock-closed" size={60} color="#8C92AC" />
        <Text style={[styles.title, { marginTop: 20 }]}>{t('accessDeniedTitle')}</Text>
        <Text style={styles.subtitle}>{t('accessDeniedMsg')}</Text>
        <TouchableOpacity style={{ marginTop: 30, padding: 15, backgroundColor: '#8C92AC', borderRadius: 10 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8C92AC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('pendingSubmissions')} ({requests.length})</Text>
      </View>

      {/* Pending Reviews Navigation Card */}
      <TouchableOpacity
        style={styles.navCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AdminPendingReviews')}
      >
        <View style={styles.navIconContainer}>
          <Ionicons name="chatbubbles-outline" size={24} color="#FFF" />
        </View>
        <View style={styles.navTextContainer}>
          <Text style={styles.navTitle}>{t('pendingReviews') || 'Pending Reviews'}</Text>
          <Text style={styles.navSubtitle}>{t('pendingReviewsDesc') || 'Moderate and approve user place reviews'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8C92AC" />
      </TouchableOpacity>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5E5E5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E5E5' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8C92AC', marginHorizontal: 20, marginTop: 20, marginBottom: 15, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 25 },
  backButton: { marginRight: 10 },
  headerText: { fontSize: 18, color: 'white', fontWeight: '600' },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#000000',
    elevation: 2,
  },
  navIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8C92AC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTextContainer: { flex: 1, marginLeft: 12 },
  navTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  navSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#000000', overflow: 'hidden', alignItems: 'center' },
  cardImage: { width: 90, height: 90, borderTopLeftRadius: 15, borderBottomLeftRadius: 15, backgroundColor: '#cccccc' },
  cardTextContainer: { flex: 1, paddingHorizontal: 15, paddingVertical: 10, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '500', fontFamily: 'serif', marginBottom: 5, color: '#000' },
  subtitle: { fontSize: 12, color: '#333' }
});