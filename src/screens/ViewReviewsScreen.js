import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/FirebaseConfig';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, globalStyles } from '../styles/theme';

export default function ViewReviewsScreen({ navigation, route }) {
  const { placeId, placeName } = route.params || {};
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [placeId]);

  const fetchReviews = async () => {
    if (!placeId) {
      setLoading(false);
      return;
    }

    try {
      const fetchedReviews = [];

      // Query from 'Reviews'
      try {
        const q1 = query(collection(db, "Reviews"), where("place_id", "==", placeId));
        const snap1 = await getDocs(q1);
        snap1.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.status || data.status === 'approved') {
            fetchedReviews.push({ id: docSnap.id, ...data });
          }
        });
      } catch (e1) {
        console.log("Error querying Reviews collection:", e1);
      }

      // Query from 'reviews' (lowercase fallback)
      try {
        const q2 = query(collection(db, "reviews"), where("place_id", "==", placeId));
        const snap2 = await getDocs(q2);
        snap2.forEach((docSnap) => {
          const data = docSnap.data();
          if ((!data.status || data.status === 'approved') && !fetchedReviews.some((r) => r.id === docSnap.id)) {
            fetchedReviews.push({ id: docSnap.id, ...data });
          }
        });
      } catch (e2) {
        console.log("Error querying reviews collection:", e2);
      }

      // Sort by timestamp descending
      fetchedReviews.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return timeB - timeA;
      });

      // Resolve display names for each reviewer (fallback to 'Anonymous')
      const resolvedReviews = await Promise.all(
        fetchedReviews.map(async (review) => {
          let displayName = review.userName;

          if (!displayName || (typeof displayName === 'string' && displayName.length >= 20 && !displayName.includes(' '))) {
            const uidToLookup = review.user_id || (typeof displayName === 'string' && displayName.length >= 20 ? displayName : null);
            if (uidToLookup) {
              try {
                const userSnap = await getDoc(doc(db, "users", uidToLookup));
                if (userSnap.exists()) {
                  const uData = userSnap.data();
                  displayName = uData.displayName || uData.name || uData.username || uData.email?.split('@')[0] || t('anonymousUser') || 'Anonymous';
                } else {
                  displayName = t('anonymousUser') || 'Anonymous';
                }
              } catch (e) {
                displayName = t('anonymousUser') || 'Anonymous';
              }
            } else {
              displayName = t('anonymousUser') || 'Anonymous';
            }
          }

          return {
            ...review,
            userName: displayName || t('anonymousUser') || 'Anonymous'
          };
        })
      );

      setReviews(resolvedReviews);
    } catch (error) {
      console.log("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const numRating = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= numRating ? "star" : "star-outline"}
          size={18}
          color="#F29C38"
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {placeName ? `${placeName} - ${t('reviews')}` : t('reviews')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              {/* User info header */}
              <View style={styles.cardHeader}>
                <View style={styles.userRow}>
                  <Ionicons name="person-circle-outline" size={36} color={COLORS.primary} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.userName}>{item.userName || t('anonymousUser') || 'Anonymous'}</Text>
                    <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
                  </View>
                </View>
              </View>

              {/* Comment text */}
              {item.comment ? (
                <Text style={styles.commentText}>{item.comment}</Text>
              ) : null}

              {/* Stars rating below comment */}
              <View style={styles.starsRowBelow}>
                {renderStars(item.rating)}
              </View>

              {/* Review photo preview if uploaded */}
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.reviewImage} />
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.placeholder} />
              <Text style={styles.emptyText}>{t('noReviewsYet')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: COLORS.background,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '400', fontFamily: 'serif', color: COLORS.textDark, flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, fontFamily: 'serif' },
  dateText: { fontSize: 12, color: COLORS.textLight, marginTop: 1, fontFamily: 'serif' },
  commentText: { fontSize: 15, color: COLORS.textDark, lineHeight: 22, marginBottom: 8, fontFamily: 'serif' },
  starsRowBelow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewImage: { width: '100%', height: 160, borderRadius: 12, marginTop: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: COLORS.textLight, fontFamily: 'serif' },
});
