import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../services/FirebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminPendingReviewsScreen({ navigation }) {
    const { userRole } = useAuth();
    const { t } = useLanguage();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (userRole !== 'admin') return;
        fetchPendingReviews();
    }, [userRole]);

    const fetchPendingReviews = async () => {
        setLoading(true);
        try {
            const pendingReviews = [];

            // Query from Reviews
            try {
                const q1 = query(collection(db, 'Reviews'), where('status', '==', 'pending'));
                const snap = await getDocs(q1);
                snap.forEach((docSnap) => {
                    pendingReviews.push({ id: docSnap.id, col: 'Reviews', ...docSnap.data() });
                });
            } catch (e1) {
                console.log('Error fetching pending Reviews:', e1);
            }


            // Resolve place names and user names
            const resolved = await Promise.all(
                pendingReviews.map(async (rev) => {
                    let placeName = 'Place';
                    if (rev.place_id) {
                        try {
                            const pSnap = await getDoc(doc(db, 'places', rev.place_id));
                            if (pSnap.exists()) {
                                placeName = pSnap.data().placeName || 'Place';
                            }
                        } catch (e) { }
                    }
                    return {
                        ...rev,
                        placeName,
                    };
                })
            );

            setReviews(resolved);
        } catch (error) {
            console.error('Error fetching pending reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const recalculatePlaceScores = async (placeId) => {
        if (!placeId) return;
        try {
            const placeRef = doc(db, 'places', placeId);
            const placeSnap = await getDoc(placeRef);
            if (!placeSnap.exists()) return;

            const placeData = placeSnap.data();

            const approvedReviews = [];

            // Query 'Reviews' collection
            try {
                const q1 = query(collection(db, 'Reviews'), where('place_id', '==', placeId));
                const snap1 = await getDocs(q1);
                snap1.forEach((d) => {
                    const data = d.data();
                    if (!data.status || data.status === 'approved') {
                        approvedReviews.push(data);
                    }
                });
            } catch (e) {
                console.log('Error querying Reviews collection for calc:', e);
            }

            const wifiScores = [];
            const soundScores = [];
            const outletsScores = [];
            const tranquilityScores = [];

            // Baseline scores from initial place document
            if (placeData.wifiScore !== undefined || placeData.wifiStrength !== undefined) {
                const val = Number(placeData.wifiScore ?? placeData.wifiStrength);
                if (!isNaN(val)) wifiScores.push(val);
            }
            if (placeData.soundScore !== undefined || placeData.soundCondition !== undefined) {
                const val = Number(placeData.soundScore ?? placeData.soundCondition);
                if (!isNaN(val)) soundScores.push(val);
            }
            if (placeData.outletsScore !== undefined || placeData.powerOutlets !== undefined) {
                const val = Number(placeData.outletsScore ?? placeData.powerOutlets);
                if (!isNaN(val)) outletsScores.push(val);
            }
            if (placeData.tranquility !== undefined) {
                const val = Number(placeData.tranquility);
                if (!isNaN(val)) tranquilityScores.push(val);
            }

            // Ratings & scores from all approved reviews
            approvedReviews.forEach((rev) => {
                if (rev.wifiStrength !== undefined && rev.wifiStrength !== null) {
                    const num = Number(rev.wifiStrength);
                    if (!isNaN(num)) wifiScores.push(num);
                }
                if (rev.soundCondition !== undefined && rev.soundCondition !== null) {
                    const num = Number(rev.soundCondition);
                    if (!isNaN(num)) soundScores.push(num);
                }
                if (rev.powerOutlets !== undefined && rev.powerOutlets !== null) {
                    const num = Number(rev.powerOutlets);
                    if (!isNaN(num)) outletsScores.push(num);
                }
                if (rev.rating !== undefined && rev.rating !== null) {
                    const num = Number(rev.rating);
                    if (!isNaN(num)) tranquilityScores.push(num);
                }
            });

            const updateData = {};

            if (wifiScores.length > 0) {
                const avg = wifiScores.reduce((a, b) => a + b, 0) / wifiScores.length;
                updateData.wifiStrength = Number(avg.toFixed(1));
            }
            if (soundScores.length > 0) {
                const avg = soundScores.reduce((a, b) => a + b, 0) / soundScores.length;
                updateData.soundCondition = Number(avg.toFixed(1));
            }
            if (outletsScores.length > 0) {
                const avg = outletsScores.reduce((a, b) => a + b, 0) / outletsScores.length;
                updateData.powerOutlets = Number(avg.toFixed(1));
            }
            if (tranquilityScores.length > 0) {
                const avg = tranquilityScores.reduce((a, b) => a + b, 0) / tranquilityScores.length;
                updateData.tranquility = Number(avg.toFixed(1));
            }

            if (Object.keys(updateData).length > 0) {
                await updateDoc(placeRef, updateData);
            }
        } catch (error) {
            console.error('Error recalculating place scores:', error);
        }
    };

    const handleApprove = async (item) => {
        Alert.alert(
            t('approveReviewTitle') || 'Approve Review',
            t('approveReviewConfirm') || 'Are you sure you want to approve and publish this review?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('approve'),
                    onPress: async () => {
                        setProcessingId(item.id);
                        try {
                            const colName = item.col || 'Reviews';
                            await updateDoc(doc(db, colName, item.id), { status: 'approved' });
                            
                            if (item.place_id) {
                                await recalculatePlaceScores(item.place_id);
                            }

                            Alert.alert(t('success'), t('reviewApprovedMsg') || 'Review has been approved and published!');
                            setReviews((prev) => prev.filter((r) => r.id !== item.id));
                        } catch (err) {
                            console.error('Error approving review:', err);
                            Alert.alert(t('error'), err.message);
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (item) => {
        Alert.alert(
            t('rejectReviewTitle') || 'Reject Review',
            t('deleteReviewConfirm') || 'Are you sure you want to permanently delete this review?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingId(item.id);
                        try {
                            const colName = item.col || 'Reviews';
                            await deleteDoc(doc(db, colName, item.id));
                            Alert.alert(t('success'), t('reviewDeletedMsg') || 'Review has been deleted.');
                            setReviews((prev) => prev.filter((r) => r.id !== item.id));
                        } catch (err) {
                            console.error('Error deleting review:', err);
                            Alert.alert(t('error'), err.message);
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const renderStars = (rating) => {
        const stars = [];
        const numRating = Number(rating) || 0;
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= numRating ? 'star' : 'star-outline'}
                    size={16}
                    color="#F29C38"
                    style={{ marginRight: 2 }}
                />
            );
        }
        return stars;
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
            ) : null}
            <View style={styles.cardTextContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {item.placeName}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                    By: {item.userName || item.user_id || 'User'}
                </Text>
                <View style={styles.starsRow}>{renderStars(item.rating)}</View>

                {item.comment ? (
                    <Text style={styles.commentText} numberOfLines={3}>
                        "{item.comment}"
                    </Text>
                ) : null}

                {/* Extra Details Row for Wi-Fi, Sound, Outlets */}
                <View style={styles.detailsContainer}>
                    {item.wifiStrength ? (
                        <View style={styles.detailBadge}>
                            <Feather name="wifi" size={12} color="#555" style={styles.detailIcon} />
                            <Text style={styles.detailText}>{item.wifiStrength}</Text>
                        </View>
                    ) : null}

                    {item.soundCondition ? (
                        <View style={styles.detailBadge}>
                            <Ionicons name="volume-medium-outline" size={12} color="#555" style={styles.detailIcon} />
                            <Text style={styles.detailText}>{item.soundCondition}</Text>
                        </View>
                    ) : null}

                    {item.powerOutlets ? (
                        <View style={styles.detailBadge}>
                            <MaterialCommunityIcons name="power-plug-outline" size={12} color="#555" style={styles.detailIcon} />
                            <Text style={styles.detailText}>{item.powerOutlets}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.btn, styles.approveBtn]}
                        onPress={() => handleApprove(item)}
                        disabled={processingId === item.id}
                    >
                        <Ionicons name="checkmark-circle-outline" size={18} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btn, styles.rejectBtn]}
                        onPress={() => handleReject(item)}
                        disabled={processingId === item.id}
                    >
                        <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.btnText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (userRole !== 'admin') {
        return (
            <SafeAreaView style={styles.center}>
                <Ionicons name="lock-closed" size={60} color="#8C92AC" />
                <Text style={[styles.title, { marginTop: 20 }]}>{t('accessDeniedTitle')}</Text>
                <TouchableOpacity
                    style={{ marginTop: 30, padding: 15, backgroundColor: '#8C92AC', borderRadius: 10 }}
                    onPress={() => navigation.goBack()}
                >
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
                <Text style={styles.headerText}>{t('pendingReviews') || 'Pending Reviews'} ({reviews.length})</Text>
            </View>

            <FlatList
                data={reviews}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-done-circle-outline" size={50} color="#888" />
                        <Text style={styles.emptyText}>{t('noPendingReviews') || 'No pending reviews to moderate.'}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E5E5E5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E5E5' },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8C92AC',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 25,
    },
    backButton: { marginRight: 10 },
    headerText: { fontSize: 18, color: 'white', fontWeight: '600' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    card: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#000000',
        overflow: 'hidden',
        padding: 12,
    },
    cardImage: { width: '100%', height: 120, borderRadius: 10, marginBottom: 10, backgroundColor: '#cccccc' },
    cardTextContainer: { flex: 1 },
    title: { fontSize: 18, fontWeight: 'bold', fontFamily: 'serif', color: '#000' },
    subtitle: { fontSize: 13, color: '#555', marginTop: 2 },
    starsRow: { flexDirection: 'row', marginTop: 5, marginBottom: 5 },
    commentText: { fontSize: 14, color: '#333', fontStyle: 'italic', marginBottom: 10 },

    // New Styles for the Details Badges
    detailsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
        gap: 8,
    },
    detailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    detailIcon: {
        marginRight: 4,
    },
    detailText: {
        fontSize: 12,
        color: '#555',
    },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flex: 0.48,
    },
    approveBtn: { backgroundColor: '#34A853' },
    rejectBtn: { backgroundColor: '#EA4335' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { marginTop: 10, fontSize: 16, color: '#666' },
});