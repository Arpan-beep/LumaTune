import React from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 45) / 2;

export default function PlaceGalleryScreen({ navigation, route }) {
    const { t } = useLanguage();
    const images = route?.params?.images || [];
    const placeName = route?.params?.placeName || t('gallery') || 'Gallery';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {placeName} - {t('photos') || 'Photos'}
                </Text>
            </View>

            {/* Photos Grid */}
            <FlatList
                data={images}
                keyExtractor={(item, index) => index.toString()}
                numColumns={2}
                contentContainerStyle={styles.gridContent}
                renderItem={({ item }) => (
                    <Image source={{ uri: item }} style={styles.galleryImage} />
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>{t('noPhotosAvailable') || 'No additional photos available.'}</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF', paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', flex: 1 },
    gridContent: { padding: 15 },
    galleryImage: { width: COLUMN_WIDTH, height: COLUMN_WIDTH, borderRadius: 10, margin: 5 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 16 }
});
