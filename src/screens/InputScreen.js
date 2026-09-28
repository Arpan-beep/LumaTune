import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Dimensions, TextInput, ScrollView, Alert } from "react-native";
import { Slider } from "@miblanchard/react-native-slider";
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, getDocs, DocumentReference } from "firebase/firestore";
import { auth, db } from "../services/FirebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from '../context/LanguageContext';
import { globalStyles, COLORS } from "../styles/theme";

import CustomDropdown from "../components/CustomDropdown";
import { RadioGroup } from "../components/CustomRadioGroup";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Input({ navigation }) {
    const [mood, setMood] = useState(0.5);
    const [activity, setActivity] = useState(null);
    const [activitiesData, setActivitiesData] = useState([]);
    const [soundPreference, setSoundPreference] = useState(null);
    const [needPower, setNeedPower] = useState(null);
    const [needWifi, setNeedWifi] = useState(null);
    const [note, setNote] = useState('');

    const { userToken } = useAuth();
    const { t, language } = useLanguage();
    const userName = auth.currentUser?.displayName || t('defaultUserName');

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "activities"));
                const list = querySnapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    const itemLabel = language === 'pt'
                        ? (data.label_pt || data.label || data.name || data.title || data.label_en || docSnap.id)
                        : (data.label_en || data.label || data.name || data.title || data.label_pt || docSnap.id);
                    const itemValue = data.value || data.name || docSnap.id;
                    return {
                        label: itemLabel,
                        value: itemValue,
                    };
                });
                setActivitiesData(list);
            } catch (error) {
                console.error("Error fetching activities from Firestore:", error);
                setActivitiesData([]);
            }
        };

        fetchActivities();
    }, [language]);

    const soundData = [
        { label: t('soundQuiet'), value: 'Quiet' },
        { label: t('moderate'), value: 'Moderate' },
        { label: t('soundAny'), value: 'None' }
    ];

    const powerOptions = [
        { label: t('outletsNone'), value: 'None' },
        { label: t('outletsSome'), value: 'Some' },
        { label: t('outletsMany'), value: 'Many' }
    ];

    const wifiOptions = [
        { label: t('wifiNone'), value: 'None' },
        { label: t('moderate'), value: 'Moderate' },
        { label: t('wifiGood'), value: 'Strong' }
    ];

    const handleSaveInput = async () => {
        if (!activity) {
            Alert.alert(t('error'), t('selectActivityMsg'));
            return;
        } else if (!soundPreference) {
            Alert.alert(t('error'), t('selectSoundMsg'));
            return;
        }
        const userInputRef = collection(db, "users", userToken, "Journal");
        let docRef = null;
        try {
            docRef = await addDoc(userInputRef, {
                mood,
                activity,
                soundPreference,
                needPower,
                note,
                needWifi,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            Alert.alert(t('error'));
            console.log(error);
        }

        navigation.navigate('RecommendationScreen', {
            journalId: docRef?.id || null,
            mood, 
            activity, 
            soundPreference, 
            needPower,
            needWifi,
            note
        });
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: COLORS.background }}
            contentContainerStyle={[globalStyles.container, styles.scrollContent, { flex: undefined }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={styles.welcomeText}>{t('hello')} {userName}</Text>
                <Text style={styles.subtitle}>{t('howAreYouFeeling')}</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.inputCard}>
                    <View style={styles.cardTopArea}>
                        <View style={styles.iconHeader}>
                            <Ionicons name="musical-notes" size={SCREEN_WIDTH * 0.12} color={COLORS.primary} />
                            <Ionicons name="location" size={SCREEN_WIDTH * 0.12} color={COLORS.accent} />
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.subtitle1}>{t('slideMatchMood')}</Text>
                    </View>

                    <View style={styles.sliderWrapper}>
                        <Slider
                            minimumValue={0}
                            maximumValue={1}
                            step={0.1}
                            value={mood}
                            onValueChange={(value) => setMood(Array.isArray(value) ? value[0] : value)}
                            minimumTrackTintColor={COLORS.primary}
                            maximumTrackTintColor={COLORS.border}
                            thumbTintColor={COLORS.secondary}
                            trackStyle={styles.track}
                            thumbStyle={styles.thumb}
                        />
                    </View>

                    <View style={styles.emojiContainer}>
                        <Text style={styles.emoji}>☹️</Text>
                        <Text style={styles.emoji}>😐</Text>
                        <Text style={styles.emoji}>😊</Text>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.subtitle1}>{t('whatsYourPlan')}</Text>
                    </View>

                    <CustomDropdown
                        data={activitiesData}
                        value={activity}
                        setValue={setActivity}
                        placeholder={t('selectActivityMsg')}
                    />

                    <View style={styles.preferencesContainer}>
                        <CustomDropdown
                            data={soundData}
                            value={soundPreference}
                            setValue={setSoundPreference}
                            placeholder={t('selectSoundMsg') || 'Sound Preference'}
                        />
                    </View>

                    <TextInput
                        style={styles.textInput}
                        placeholder={t('optionalNote') || 'Add an optional reflection note...'}
                        placeholderTextColor={COLORS.textLight}
                        value={note}
                        onChangeText={setNote}
                        multiline={true}
                        numberOfLines={3}
                    />

                    <View style={styles.sectionHeader}>
                        <Text style={styles.subtitle101}>{t('selectPowerPreference')}</Text>

                        <RadioGroup
                            options={powerOptions}
                            selectedValue={needPower}
                            onValueChange={setNeedPower}
                        />
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.subtitle101}>{t('selectWifiPreference')}</Text>

                        <RadioGroup
                            options={wifiOptions}
                            selectedValue={needWifi}
                            onValueChange={setNeedWifi}
                        />
                    </View>

                    <TouchableOpacity
                        style={[globalStyles.recommendationButton, styles.dynamicButton]}
                        onPress={handleSaveInput}
                    >
                        <Text style={globalStyles.buttonText}>{t('getRecommendation')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        marginTop: SCREEN_HEIGHT * 0.06,
        marginBottom: SCREEN_HEIGHT * 0.02
    },
    welcomeText: {
        fontFamily: 'serif',
        fontSize: SCREEN_WIDTH * 0.08,
        color: COLORS.textDark,
        marginLeft: 11
    },
    subtitle: {
        fontFamily: 'serif',
        fontSize: SCREEN_WIDTH * 0.045,
        color: COLORS.textLight,
        marginTop: SCREEN_HEIGHT * 0.01,
        marginLeft: 14
    },
    sectionHeader: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 10
    },
    subtitle1: {
        fontFamily: 'serif',
        fontSize: SCREEN_WIDTH * 0.06,
        color: COLORS.textDark,
        textAlign: 'center'
    },
    subtitle101: {
        fontFamily: 'serif',
        fontSize: SCREEN_WIDTH * 0.04,
        color: COLORS.textDark,
        paddingBottom: SCREEN_WIDTH * 0.05,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 35
    },
    inputCard: {
        width: SCREEN_WIDTH * 0.9,
        backgroundColor: COLORS.white,
        borderRadius: 25,
        padding: 20,
        paddingVertical: 30,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8
    },
    cardTopArea: {
        width: '100%',
        marginBottom: 15
    },
    iconHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10
    },
    sliderWrapper: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.06,
        justifyContent: 'center',
        marginTop: 5
    },
    track: {
        height: 12,
        borderRadius: 6
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.secondary,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84
    },
    emojiContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 15,
        marginTop: 5,
        marginBottom: 25
    },
    emoji: {
        fontSize: SCREEN_WIDTH * 0.06
    },
    preferencesContainer: {
        width: '100%',
        marginVertical: 10
    },
    textInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.border || '#ccc',
        borderRadius: 10,
        padding: 12,
        marginVertical: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    dynamicButton: {
        width: '100%',
        paddingVertical: SCREEN_HEIGHT * 0.02,
        marginTop: 15
    }
});