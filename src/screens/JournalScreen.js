import { View, Text, SectionList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "../services/FirebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { globalStyles, COLORS } from "../styles/theme";
import { useFocusEffect } from "@react-navigation/native";

const JournalScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [weekEntries, setWeekEntries] = useState([]);
    const [earlierEntries, setEarlierEntries] = useState([]);
    const [monthEntries, setMonthEntries] = useState([]);
    
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const { t } = useLanguage();

    const toMs = (ts) => (ts?.toMillis ? ts.toMillis() : new Date(ts).getTime());
    
    useFocusEffect(
        useCallback(() => {
            const fetchJournalEntries = async () => {
                const userId = auth.currentUser?.uid;
                if (!userId) return;
                setLoading(true);
                try {
                    const q = query(collection(db, "users", userId, "Journal"), orderBy("createdAt", "desc"));
                    const snapshot = await getDocs(q);
                    const journalList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setEntries(journalList);
                    
                    const week = journalList.filter(e => toMs(e.createdAt) >= sevenDaysAgo);
                    setWeekEntries(week);

                    const earlier = journalList.filter(e => toMs(e.createdAt) < sevenDaysAgo);
                    setEarlierEntries(earlier);
                    
                    const month = journalList.filter(e => toMs(e.createdAt) >= thirtyDaysAgo);
                    setMonthEntries(month);
                 
                } catch (error) {
                    console.error("Error fetching journal:", error);
                } finally {
                    setLoading(false);
                }
            };

            fetchJournalEntries(); 
        }, []) 
    );

    // --- Helpers ---

    const getMoodEmoji = (moodValue) => {
        if (isNaN(moodValue) || moodValue === null) return '🤔'; 
        if (moodValue <= 0.33) return '☹️';
        if (moodValue <= 0.66) return '😐';
        return '😊';
    };

    const getMoodLabel = (moodValue) => {
        if (isNaN(moodValue) || moodValue === null) return ''; 
        if (moodValue <= 0.33) return t('moodDown');
        if (moodValue <= 0.66) return t('moodBalanced');
        return t('moodUpbeat');
    };

    const getMoodColor = (moodValue) => {
        if (isNaN(moodValue) || moodValue === null) return '#ccc';
        if (moodValue <= 0.33) return '#ef4444'; // Red
        if (moodValue <= 0.66) return '#f59e0b'; // Yellow
        return '#10b981'; // Green
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const avgMood = (list) => {
        if (!list || list.length === 0) return null;
        return (list.reduce((sum, item) => sum + (item.mood ?? 0.5), 0) / list.length).toFixed(1);
    };

    const avgMood10 = (list) => {
        const avg = avgMood(list);
        if (!avg) return null;
        return Math.round(parseFloat(avg) * 10);
    };

    const getActivityIcon = (act) => {
      if (act === 'work_study') return t('activityWorkStudyTag');
      if (act === 'exercise') return t('activityExerciseTag');
      return t('activityRelaxingTag');
    };

    const getSoundBadge = (sound) => {
        if (sound === 'Quiet' || sound === 'Silencioso') return t('soundQuietTag');
        if (sound === 'Moderate' || sound === 'Moderado') return t('soundModerateTag');
        return null; // Hides 'Any', 'None', or empty
    };

    const getTopActivity = (list) => {
        if (!list || list.length === 0) return t('none');
        const counts = {};
        let maxCount = 0;

        // 1. Count occurrences and find the highest count
        list.forEach(e => {
            if (e.activity) {
                counts[e.activity] = (counts[e.activity] || 0) + 1;
                if (counts[e.activity] > maxCount) {
                    maxCount = counts[e.activity];
                }
            }
        });

        if (maxCount === 0) return t('none');

        // 2. Filter out all activities that tied for the max count
        const topActivities = Object.keys(counts).filter(key => counts[key] === maxCount);

        // 3. Map them to translations and join with ' & '
        return topActivities
            .map(act => {
                if (act === 'work_study') return t('activityWorkStudy');
                if (act === 'relax') return t('activityRelax');
                if (act === 'exercise') return t('activityExercise');
                return act; // Fallback
            })
            .join(' & ');
    };

    // --- Renderers ---

    const sections = [];
    if (weekEntries.length > 0) sections.push({ title: t('thisWeekSection'), data: weekEntries });
    if (earlierEntries.length > 0) sections.push({ title: t('earlierEntriesSection'), data: earlierEntries });

    const renderJournalCard = ({ item }) => {
        const moodScore10 = Math.round((item.mood ?? 0.5) * 10);

        return (
            <TouchableOpacity 
                style={[styles.card, { borderLeftColor: getMoodColor(item.mood) }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('RecommendationScreen', { 
                    mood: item.mood, 
                    activity: item.activity, 
                    soundPreference: item.soundPreference, 
                    needPower: item.needPower, 
                    needWifi: item.needWifi, 
                    note: item.note,
                    cachedPlaylists: item.playlists || null,
                })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    <View style={styles.moodBadge}>
                        <Text style={styles.moodEmoji}>{getMoodEmoji(item.mood)} {moodScore10}/10</Text>
                    </View>
                </View>

                <View style={styles.inlineTagsContainer}>
                    {item.activity && (
                        <Text style={styles.inlineTagText}>{getActivityIcon(item.activity)} </Text>
                    )}
                    {item.soundPreference && item.soundPreference !== 'None' && item.soundPreference !== 'Any' && (
                        <Text style={styles.inlineTagText}>{getSoundBadge(item.soundPreference)}</Text>
                    )}
                    {item.needPower && item.needPower !== 'None' && (
                        <Text style={styles.inlineTagText}>{t('powerTag')}</Text>
                    )}
                    {item.needWifi && item.needWifi !== 'None' && (
                        <Text style={styles.inlineTagText}>{t('wifiTag')}</Text>
                    )}
                </View>

                {item.note ? (
                    <Text style={styles.noteText}>"{item.note}"</Text>
                ) : null}

                <Text style={styles.replayText}>{t('replayContext')}</Text>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View>
            <View style={styles.headerContainer}>
                <Text style={styles.screenTitle}>{t('journalScreenTitle')}</Text>
                <Text style={styles.screenSubtitle}>{t('journalScreenSubtitle')}</Text>
            </View>

            {entries.length > 0 && (
                <View style={styles.dashboardContainer}>
                    <Text style={styles.sectionHeading}>{t('insightsTitle')}</Text>
                    <View style={styles.statsGrid}>
                       {/* Box 1: This Week */}
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>📅 {t('thisWeek')}</Text>
                            <Text style={styles.statValue}>
                                {getMoodEmoji(parseFloat(avgMood(weekEntries)))}{' '}
                                {avgMood10(weekEntries) ? `${avgMood10(weekEntries)}/10` : 'N/A'}{' '}
                                {weekEntries.length ? getMoodLabel(parseFloat(avgMood(weekEntries))) : ''}
                            </Text>
                        </View>
                    
                        {/* Box 2: This Month */}
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>🗓️ {t('thisMonth')}</Text>
                            <Text style={styles.statValue}>
                                {getMoodEmoji(parseFloat(avgMood(monthEntries)))}{' '}
                                {avgMood10(monthEntries) ? `${avgMood10(monthEntries)}/10` : 'N/A'}{' '}
                                {monthEntries.length ? getMoodLabel(parseFloat(avgMood(monthEntries))) : ''}
                            </Text>
                        </View>

                        {/* Box 3: Top Activity */}
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>🎯 {t('topActivity')}</Text>
                            <Text style={styles.statValue}>🎵 {getTopActivity(entries)}</Text>
                        </View>

                        {/* Box 4: Total Entries */}
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>📝 {t('totalEntries')}</Text>
                            <Text style={styles.statValue}>{entries.length} {t('logged')}</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary || "#0000ff"} />
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                renderItem={renderJournalCard}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeading}>{title}</Text>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t('noJournalEntries')}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    screenTitle: {
        fontSize: 28, 
        fontWeight: 'bold',
        color: COLORS.textDark || '#333',
        fontFamily: 'serif',
    },
    screenSubtitle: {
        fontSize: 15,
        color: COLORS.textLight || '#666',
        marginTop: 6,
    },
    dashboardContainer: {
        marginTop: 15,
    },
    sectionHeading: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.textLight || '#666',
        letterSpacing: 1.2,
        paddingHorizontal: 20,
        marginVertical: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    statBox: {
        width: '48%',
        backgroundColor: COLORS.white || '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight || '#666',
        fontWeight: '600',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.textDark || '#333',
    },
    listContent: {
        paddingBottom: 40
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        borderLeftWidth: 6,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        elevation: 2,
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.06, 
        shadowRadius: 4, 
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    dateText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600'
    },
    moodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    moodEmoji: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333'
    },
    inlineTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginVertical: 6,
    },
    inlineTagText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500'
    },
    noteText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#444',
        marginTop: 8,
        lineHeight: 20,
    },
    replayText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.primary || '#0066cc',
        textAlign: 'right',
        marginTop: 12,
    },
    emptyContainer: {
        paddingTop: 50,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center'
    }
});

export default JournalScreen;