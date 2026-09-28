import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Image, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Context & Services
import { auth, db } from '../services/FirebaseConfig';
import { useLanguage } from '../context/LanguageContext';
import { globalStyles, COLORS } from '../styles/theme';

const SavedPlaylistsScreen = () => {
    const navigation = useNavigation();
    const { t } = useLanguage();

    const [playlists, setPlaylists] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchPlaylists = async () => {
                const userId = auth.currentUser?.uid;
                if (!userId) return;
                setLoading(true);
                try {
                    const snap = await getDocs(collection(db, "users", userId, "saved_playlists"));
                    setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchPlaylists();
        }, [])
    );

    const handleRemove = async (id) => {
        try {
            await deleteDoc(doc(db, "users", auth.currentUser?.uid, "saved_playlists", id));
            setPlaylists(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Error removing playlist: ", error);
        }
    };

    const filtered = playlists.filter(p => 
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.channelTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <View style={styles.savedPlaylistItem}>
            <Image source={{ uri: item.thumbnail }} style={styles.savedPlaylistThumb} />
            <View style={styles.savedPlaylistInfo}>
                <Text style={styles.savedPlaylistTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.savedPlaylistChannel} numberOfLines={1}>{item.channelTitle}</Text>
                
                <View style={styles.savedPlaylistActions}>
                    <TouchableOpacity 
                        style={styles.playButton} 
                        onPress={() => Linking.openURL(`https://www.youtube.com/playlist?list=${item.id}`)}
                    >
                        <Text style={styles.playButtonText}>{t('playButton') || '▶ Play'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={() => handleRemove(item.id)}
                    >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={globalStyles.screenContainer}>
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={COLORS.textDark || '#333'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('savedPlaylists')}</Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textLight || '#999'} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('searchPlaylistsPlaceholder')}
                    placeholderTextColor={COLORS.textLight || '#999'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {searchQuery ? t('noPlaylistsMatch') : t('noSavedPlaylists')}
                        </Text>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: COLORS.white || '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#E0E0E0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textDark || '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white || '#FFF',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border || '#E0E0E0',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.textDark || '#333',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    savedPlaylistItem: {
        flexDirection: 'row',
        backgroundColor: COLORS.white || '#FFF',
        padding: 12,
        borderRadius: 16,
        marginBottom: 15,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.border || '#f0f0f0',
    },
    savedPlaylistThumb: {
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#e0e0e0',
    },
    savedPlaylistInfo: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    savedPlaylistTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.textDark || '#333',
        marginBottom: 4,
    },
    savedPlaylistChannel: {
        fontSize: 13,
        color: COLORS.textLight || '#666',
        marginBottom: 8,
    },
    savedPlaylistActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    playButton: {
        backgroundColor: COLORS.primary || '#007BFF',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
    },
    playButtonText: {
        color: COLORS.white || '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 6,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
    },
    deleteButtonText: {
        fontSize: 16,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: COLORS.textLight || '#999',
        marginTop: 40,
    },
});

export default SavedPlaylistsScreen;