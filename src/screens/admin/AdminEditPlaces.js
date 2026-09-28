import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../services/FirebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getWifiLabel, getSoundLabel, getOutletsLabel } from '../../utils/attributeTranslator';

export default function AdminEditPlacesScreen({ navigation }) {
    const { userRole } = useAuth();
    const { t } = useLanguage();
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Modal States
    const [editingPlace, setEditingPlace] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [placeName, setPlaceName] = useState('');
    const [suitableFor, setSuitableFor] = useState('');
    const [tranquility, setTranquility] = useState(3);
    const [isWheelchairAccessible, setIsWheelchairAccessible] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (userRole !== 'admin') return;

        setLoading(true);
        const q = query(collection(db, 'places'));

        const unsubscribe = onSnapshot(
            q,
            async (querySnapshot) => {
                const rawList = querySnapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                    .filter((p) => !p.status || p.status === 'approved');

                const resolvedList = await Promise.all(
                    rawList.map(async (place) => {
                        if (place.imageUri || place.image) {
                            return place;
                        }
                        try {
                            const q1 = query(collection(db, 'Reviews'), where('place_id', '==', place.id));
                            const snap1 = await getDocs(q1);
                            let foundImage = null;
                            snap1.forEach((docSnap) => {
                                const rData = docSnap.data();
                                if (rData.imageUri && !foundImage) {
                                    foundImage = rData.imageUri;
                                }
                            });

                            if (!foundImage) {
                                const q2 = query(collection(db, 'reviews'), where('place_id', '==', place.id));
                                const snap2 = await getDocs(q2);
                                snap2.forEach((docSnap) => {
                                    const rData = docSnap.data();
                                    if (rData.imageUri && !foundImage) {
                                        foundImage = rData.imageUri;
                                    }
                                });
                            }

                            return {
                                ...place,
                                imageUri: foundImage || null,
                            };
                        } catch (e) {
                            return place;
                        }
                    })
                );

                setPlaces(resolvedList);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching places:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userRole]);

    const handleOpenEditModal = (place) => {
        setEditingPlace(place);
        setPlaceName(place.placeName || '');
        setSuitableFor(place.suitableFor || '');
        setTranquility(place.tranquility || 3);
        setIsWheelchairAccessible(Boolean(place.isWheelchairAccessible));
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!editingPlace) return;
        if (!placeName.trim()) {
            Alert.alert(t('error') || 'Error', t('enterPlaceNameMsg') || 'Please enter a valid place name.');
            return;
        }

        setUpdating(true);
        try {
            const placeRef = doc(db, 'places', editingPlace.id);
            await updateDoc(placeRef, {
                placeName: placeName.trim(),
                suitableFor: suitableFor.trim(),
                tranquility: Number(tranquility),
                isWheelchairAccessible: Boolean(isWheelchairAccessible),
            });

            Alert.alert(t('success') || 'Success', t('placeUpdatedSuccess') || 'Place details updated successfully!');
            setEditModalVisible(false);
            setEditingPlace(null);
        } catch (error) {
            console.error('Error updating place:', error);
            Alert.alert(t('error') || 'Error', error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeletePlace = (place) => {
        Alert.alert(
            t('deletePlace') || 'Delete Place',
            t('deletePlaceConfirm') || `Are you sure you want to permanently delete "${place.placeName}"?`,
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'places', place.id));
                            Alert.alert(t('success'), t('placeDeletedMsg') || 'Place has been removed.');
                        } catch (err) {
                            console.error('Error deleting place:', err);
                            Alert.alert(t('error'), err.message);
                        }
                    },
                },
            ]
        );
    };

    const filteredPlaces = places.filter((p) =>
        p.placeName ? p.placeName.toLowerCase().includes(searchQuery.toLowerCase()) : false
    );

    const renderItem = ({ item }) => {
        const photoUrl = item.imageUri || item.image || item.photo || null;

        return (
            <View style={styles.card}>
                {photoUrl ? (
                    <Image
                        source={{ uri: photoUrl }}
                        style={styles.cardImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.cardImageFallback}>
                        <Ionicons name="location" size={32} color="#5A8DF0" />
                    </View>
                )}
                <View style={styles.cardContent}>
                    <Text style={styles.placeTitle} numberOfLines={1}>
                        {item.placeName}
                    </Text>
                    <Text style={styles.placeSubtitle} numberOfLines={1}>
                        Suitable for: {item.suitableFor || 'N/A'} | Tranquility: {item.tranquility}/5
                    </Text>

                    {/* Attribute Pills */}
                    <View style={styles.pillsRow}>
                        {item.wifiScore !== undefined || item.wifiStrength ? (
                            <View style={styles.pill}>
                                <Feather name="wifi" size={10} color="#555" style={{ marginRight: 3 }} />
                                <Text style={styles.pillText}>{getWifiLabel(item.wifiScore ?? item.wifiStrength)}</Text>
                            </View>
                        ) : null}

                        {item.soundScore !== undefined || item.soundCondition ? (
                            <View style={styles.pill}>
                                <Ionicons name="volume-medium-outline" size={10} color="#555" style={{ marginRight: 3 }} />
                                <Text style={styles.pillText}>{getSoundLabel(item.soundScore ?? item.soundCondition)}</Text>
                            </View>
                        ) : null}

                        {item.outletsScore !== undefined || item.powerOutlets ? (
                            <View style={styles.pill}>
                                <MaterialCommunityIcons name="power-plug-outline" size={10} color="#555" style={{ marginRight: 3 }} />
                                <Text style={styles.pillText}>{getOutletsLabel(item.outletsScore ?? item.powerOutlets)}</Text>
                            </View>
                        ) : null}

                        {item.isWheelchairAccessible ? (
                            <View style={[styles.pill, { backgroundColor: '#E8F0FE' }]}>
                                <Ionicons name="body" size={10} color="#1A73E8" style={{ marginRight: 3 }} />
                                <Text style={[styles.pillText, { color: '#1A73E8', fontWeight: 'bold' }]}>Accessible</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.editBtn]}
                            onPress={() => handleOpenEditModal(item)}
                        >
                            <Ionicons name="create-outline" size={16} color="white" style={{ marginRight: 4 }} />
                            <Text style={styles.btnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.deleteBtn]}
                            onPress={() => handleDeletePlace(item)}
                        >
                            <Ionicons name="trash-outline" size={16} color="white" style={{ marginRight: 4 }} />
                            <Text style={styles.btnText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

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
            {/* Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>{t('editPlaces') || 'Edit Places'} ({places.length})</Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrapper}>
                <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('filterPlacesPlaceholder') || 'Filter places by name...'}
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#888" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Places List */}
            <FlatList
                data={filteredPlaces}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="location-outline" size={48} color="#999" />
                        <Text style={styles.emptyText}>{t('noPlacesFound') || 'No places found.'}</Text>
                    </View>
                }
            />

            {/* Edit Place Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('editPlace') || 'Edit Place'}</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>{t('placeNameLabel') || 'Place Name'}</Text>
                            <TextInput
                                style={styles.textInput}
                                value={placeName}
                                onChangeText={setPlaceName}
                                placeholder={t('enterPlaceNameMsg') || 'Place name'}
                            />

                            <Text style={styles.inputLabel}>{t('suitableForLabel') || 'Suitable For'}</Text>
                            <TextInput
                                style={styles.textInput}
                                value={suitableFor}
                                onChangeText={setSuitableFor}
                                placeholder="e.g. Relaxing, Working"
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 }}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={[styles.inputLabel, { marginBottom: 2 }]}>{t('wheelchairAccessibleLabel') || 'Wheelchair Accessible'}</Text>
                                    <Text style={{ fontSize: 12, color: '#666' }}>{t('wheelchairAccessibleDesc') || 'Ramps, elevators, or step-free entry'}</Text>
                                </View>
                                <Switch
                                    value={isWheelchairAccessible}
                                    onValueChange={setIsWheelchairAccessible}
                                    trackColor={{ false: '#ccc', true: '#8C92AC' }}
                                    thumbColor="white"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, updating && { opacity: 0.6 }]}
                                onPress={handleSaveEdit}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveBtnText}>{t('saveChanges') || 'Save Changes'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
        marginBottom: 15,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 25,
    },
    backButton: { marginRight: 10 },
    headerText: { fontSize: 18, color: 'white', fontWeight: '600' },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginBottom: 15,
        paddingHorizontal: 15,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#CCC',
    },
    searchInput: { flex: 1, fontSize: 15, color: '#000' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#000000',
        overflow: 'hidden',
        padding: 10,
        alignItems: 'center',
    },
    cardImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#CCC' },
    cardImageFallback: {
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: { flex: 1, marginLeft: 12 },
    placeTitle: { fontSize: 16, fontWeight: 'bold', color: '#000', fontFamily: 'serif' },
    placeSubtitle: { fontSize: 12, color: '#555', marginTop: 2 },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginBottom: 8 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginRight: 4,
        marginTop: 2,
    },
    pillText: { fontSize: 10, color: '#444' },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 2 },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        marginRight: 8,
    },
    editBtn: { backgroundColor: '#4285F4' },
    deleteBtn: { backgroundColor: '#EA4335' },
    btnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: '#888', fontSize: 15 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
    textInput: {
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 10,
        padding: 10,
        fontSize: 15,
        backgroundColor: '#FAFAFA',
    },
    saveBtn: {
        backgroundColor: '#34A853',
        paddingVertical: 12,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});