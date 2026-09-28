import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Dimensions,
    Alert,
    Image,
    ActivityIndicator
} from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../services/FirebaseConfig';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, globalStyles } from '../styles/theme';
import { getWifiLabel, getSoundLabel, getOutletsLabel } from '../utils/attributeTranslator';

export default function ReviewScreen({ navigation, route }) {
    const { t } = useLanguage();

    const placeId = route?.params?.placeId || "unknown_place";

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [wifiVal, setWifiVal] = useState(0);
    const [soundVal, setSoundVal] = useState(0);
    const [outletsVal, setOutletsVal] = useState(0);
    const [imageUri, setImageUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const pickImage = async () => {
        const currentUser = auth.currentUser;
        const currentUid = currentUser?.uid || 'guest';

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
                    const fileRef = ref(storage, `place_images/${currentUid}_${Date.now()}`);
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
        if (!comment.trim()) {
            Alert.alert(t('missingCommentTitle'), t('missingCommentMsg'));
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.uid) {
            Alert.alert(t('authRequiredTitle'), t('loginToReviewMsg'));
            return;
        }

        const activeUserId = currentUser.uid;
        setSubmitting(true);
        try {
            const reviewPayload = {
                place_id: placeId,
                user_id: activeUserId,
                userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
                rating: Number(rating),
                comment: comment.trim(),
                status: 'pending',
                timestamp: serverTimestamp(),
                wifiStrength: wifiVal,
                soundCondition: soundVal,
                powerOutlets: outletsVal,
                ...(imageUri ? { imageUri } : {})
            };

            const docRef = await addDoc(collection(db, "Reviews"), reviewPayload);
            await setDoc(docRef, { review_id: docRef.id }, { merge: true });

            Alert.alert(t('success'), t('reviewSubmittedMsg'));
            navigation.goBack();
        } catch (error) {
            console.error("Firebase submit review error:", error);
            Alert.alert(t('error'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('newReview')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Form Card */}
                <View style={styles.card}>
                    {/* Overall Rating Section */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('overallRating')}</Text>
                        <View style={styles.starRatingRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    activeOpacity={0.7}
                                    onPress={() => setRating(star)}
                                    style={styles.starTouch}
                                >
                                    <Ionicons
                                        name={star <= rating ? 'star' : 'star-outline'}
                                        size={32}
                                        color={star <= rating ? '#F29C38' : '#CCCCCC'}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* WiFi Strength Section */}
                    <View style={styles.section}>
                        <View style={styles.sliderHeaderRow}>
                            <Text style={styles.sliderLabel}>{t('wifiStrengthLabel')}</Text>
                            <Text style={styles.dynamicValueText}>{wifiVal} - {getWifiLabel(wifiVal)}</Text>
                        </View>
                        <Slider
                            minimumValue={0}
                            maximumValue={3}
                            step={0.5}
                            value={wifiVal}
                            onValueChange={(val) => setWifiVal(Array.isArray(val) ? val[0] : val)}
                            minimumTrackTintColor={COLORS.primary}
                            maximumTrackTintColor={COLORS.border}
                            thumbTintColor={COLORS.primary}
                            trackStyle={styles.track}
                            thumbStyle={styles.thumb}
                        />
                    </View>

                    {/* Sound Conditions Section */}
                    <View style={styles.section}>
                        <View style={styles.sliderHeaderRow}>
                            <Text style={styles.sliderLabel}>{t('soundConditionsLabel')}</Text>
                            <Text style={styles.dynamicValueText}>{soundVal} - {getSoundLabel(soundVal)}</Text>
                        </View>
                        <Slider
                            minimumValue={0}
                            maximumValue={3}
                            step={0.5}
                            value={soundVal}
                            onValueChange={(val) => setSoundVal(Array.isArray(val) ? val[0] : val)}
                            minimumTrackTintColor={COLORS.primary}
                            maximumTrackTintColor={COLORS.border}
                            thumbTintColor={COLORS.primary}
                            trackStyle={styles.track}
                            thumbStyle={styles.thumb}
                        />
                    </View>

                    {/* Power Outlets Section */}
                    <View style={styles.section}>
                        <View style={styles.sliderHeaderRow}>
                            <Text style={styles.sliderLabel}>{t('powerOutletsLabel')}</Text>
                            <Text style={styles.dynamicValueText}>{outletsVal} - {getOutletsLabel(outletsVal)}</Text>
                        </View>
                        <Slider
                            minimumValue={0}
                            maximumValue={3}
                            step={0.5}
                            value={outletsVal}
                            onValueChange={(val) => setOutletsVal(Array.isArray(val) ? val[0] : val)}
                            minimumTrackTintColor={COLORS.primary}
                            maximumTrackTintColor={COLORS.border}
                            thumbTintColor={COLORS.primary}
                            trackStyle={styles.track}
                            thumbStyle={styles.thumb}
                        />
                    </View>

                    {/* Comment Section */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('comment')}</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder={t('commentPlaceholder')}
                            placeholderTextColor={COLORS.placeholder}
                            multiline={true}
                            numberOfLines={4}
                            value={comment}
                            onChangeText={setComment}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Photo Upload Section */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('photo')}</Text>
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
                                        <Text style={styles.photoButtonText}>{t('addPhoto')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, submitting && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitButtonText}>{t('submitReview')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: COLORS.background,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '400',
        fontFamily: 'serif',
        color: COLORS.textDark,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    section: {
        marginBottom: 18,
    },
    label: {
        fontFamily: 'serif',
        fontSize: 16,
        color: COLORS.textDark,
        marginBottom: 8,
    },
    starRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    starTouch: {
        paddingRight: 10,
    },
    sliderHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    sliderLabel: {
        fontFamily: 'serif',
        fontSize: 16,
        color: COLORS.textDark,
    },
    dynamicValueText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        fontFamily: 'serif',
    },
    track: {
        height: 8,
        borderRadius: 4,
    },
    thumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#e0e0e0',
        elevation: 2,
    },
    textInput: {
        fontFamily: 'serif',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        backgroundColor: COLORS.white,
        color: COLORS.textDark,
        minHeight: 90,
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
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
        fontFamily: 'serif',
    },
});