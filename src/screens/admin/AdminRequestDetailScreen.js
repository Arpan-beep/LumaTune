import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, Modal, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/FirebaseConfig';
import { useLanguage } from '../../context/LanguageContext';
import { translateAttribute } from '../../utils/attributeTranslator';

export default function RequestDetailScreen({ route, navigation }) {
    const { placeData } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    const [processing, setProcessing] = useState(false);
    const [modalVisible, setModalVisible] = useState(true);

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
        if (!timestamp) return t('unknownTime');
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    };

    const handleApprove = async () => {
        Alert.alert(
            t('approveSubmissionTitle'),
            t('approveSubmissionMsg'),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('approve'),
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const placeRef = doc(db, 'places', placeData.id);
                            await updateDoc(placeRef, {
                                status: 'approved',
                                approvedAt: new Date()
                            });

                            Alert.alert(t('success'), t('placeApprovedMsg'));
                            navigation.goBack();

                        } catch (error) {
                            console.error("Approval error: ", error);
                            Alert.alert(t('error'), t('approveErrorMsg'));
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleReject = async () => {
        Alert.alert(
            t('rejectSubmissionTitle'),
            t('rejectSubmissionMsg'),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('reject'),
                    style: "destructive",
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const placeRef = doc(db, 'places', placeData.id);
                            await deleteDoc(placeRef);
                            Alert.alert(t('deleted'), t('submissionRemovedMsg'));
                            navigation.goBack();
                        } catch (error) {
                            console.error("Deletion error: ", error);
                            Alert.alert(t('error'), t('deleteErrorMsg'));
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const openInGoogleMaps = () => {
        const lat = placeData.latitude || 41.8058;
        const lng = placeData.longitude || -6.7572;
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url).catch(() => {
            Alert.alert(t('error'), t('googleMapsErrorMsg'));
        });
    };

    return (
        <View style={styles.container}>
            <MapView
                style={StyleSheet.absoluteFillObject}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: placeData.latitude || 41.8058,
                    longitude: placeData.longitude || -6.7572,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
            >
                <Marker coordinate={{ latitude: placeData.latitude || 41.8058, longitude: placeData.longitude || -6.7572 }} />
            </MapView>

            <View style={[styles.headerContainer, { top: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>{t('reviewSubmission')}</Text>
            </View>

            {!modalVisible && (
                <View style={styles.floatingButtonContainer}>
                    <TouchableOpacity style={styles.openModalButton} onPress={() => setModalVisible(true)}>
                        <Ionicons name="chevron-up" size={24} color="white" />
                        <Text style={styles.openModalText}>{t('viewDetails')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailsCard, { paddingBottom: insets.bottom }]}>
                        <TouchableOpacity style={styles.closeHandleContainer} onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                            <View style={styles.dragHandle} />
                            <Text style={styles.closeText}>{t('hideDetails')}</Text>
                        </TouchableOpacity>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.title}>{placeData.placeName}</Text>
                            <Text style={styles.subtitle}>
                                {t('submittedBy')} {placeData.submittedByName || t('defaultUserName')} | {formatTime(placeData.createdAt)}
                            </Text>

                            <View style={styles.imageGrid}>
                                <Image source={{ uri: placeData.imageUri || 'https://via.placeholder.com/300' }} style={styles.mainImage} />
                                <View style={styles.sideImages}>
                                    <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.smallImage} />
                                    <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.smallImage} />
                                </View>
                            </View>

                            <View style={styles.featureList}>
                                <View style={styles.featureRow}>
                                    <Feather name="check-square" size={24} color="black" style={styles.icon} />
                                    <Text style={styles.featureText}><Text style={styles.bold}>{t('suitableForLabel')} </Text>{placeData.suitableFor}</Text>
                                </View>
                                <View style={styles.featureRow}>
                                    <Feather name="thumbs-up" size={24} color="black" style={styles.icon} />
                                    <Text style={styles.featureText}><Text style={styles.bold}>{t('tranquilityRatingLabel')} </Text>{placeData.tranquility}/5</Text>
                                </View>
                                <View style={styles.featureRow}>
                                    <Ionicons name="volume-medium-outline" size={24} color="black" style={styles.icon} />
                                    <Text style={styles.featureText}><Text style={styles.bold}>{t('soundConditionsLabel')} </Text>{translateValue(placeData.soundCondition, 'sound')}</Text>
                                </View>
                                <View style={styles.featureRow}>
                                    <Feather name="wifi" size={24} color="black" style={styles.icon} />
                                    <Text style={styles.featureText}><Text style={styles.bold}>{t('wifiStrengthLabel')} </Text>{translateValue(placeData.wifiStrength, 'wifi')}</Text>
                                </View>
                                <View style={styles.featureRow}>
                                    <MaterialCommunityIcons name="power-plug-outline" size={24} color="black" style={styles.icon} />
                                    <Text style={styles.featureText}><Text style={styles.bold}>{t('powerOutletsLabel')} </Text>{translateValue(placeData.powerOutlets, 'outlets')}</Text>
                                </View>
                                <TouchableOpacity style={styles.featureRow} onPress={openInGoogleMaps}>
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
                            </View>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={[styles.actionButton, styles.approveBtn]} onPress={handleApprove} disabled={processing}>
                                    {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('approve')}</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.rejectBtn]} onPress={handleReject} disabled={processing}>
                                    <Text style={styles.btnText}>{t('reject')}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ... styles remain the same
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerContainer: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#8C92AC', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 25, zIndex: 10 },
    backButton: { marginRight: 10 },
    headerText: { fontSize: 18, color: 'white', fontWeight: '600' },
    floatingButtonContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' },
    openModalButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8C92AC', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5 },
    openModalText: { color: 'white', fontWeight: 'bold', marginLeft: 5 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    detailsCard: { height: '75%', backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1.5, borderColor: '#00000050', borderBottomWidth: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 20 },
    closeHandleContainer: { alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    dragHandle: { width: 40, height: 5, backgroundColor: '#cccccc', borderRadius: 5, marginBottom: 5 },
    closeText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '700', fontFamily: 'serif', color: '#000', marginBottom: 5 },
    subtitle: { fontSize: 14, color: '#555', marginBottom: 20 },
    imageGrid: { flexDirection: 'row', height: 180, marginBottom: 25 },
    mainImage: { flex: 2, height: '100%', marginRight: 10, borderRadius: 10 },
    sideImages: { flex: 1, justifyContent: 'space-between' },
    smallImage: { width: '100%', height: '48%', borderRadius: 10 },
    featureList: { marginBottom: 30 },
    featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    icon: { marginRight: 15, width: 30, textAlign: 'center' },
    featureText: { fontSize: 16, color: '#000' },
    bold: { fontWeight: 'bold' },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
    actionButton: { flex: 1, paddingVertical: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    approveBtn: { backgroundColor: '#1EAE58', marginRight: 10 },
    rejectBtn: { backgroundColor: '#EA3323', marginLeft: 10 },
    btnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});