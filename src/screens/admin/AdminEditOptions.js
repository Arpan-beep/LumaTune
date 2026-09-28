import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS } from '../../styles/theme';

export default function AdminEditOptionsScreen({ navigation }) {
  const { userRole } = useAuth();
  const { t } = useLanguage();

  if (userRole !== 'admin') {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="lock-closed" size={60} color="#8C92AC" />
        <Text style={[styles.title, { marginTop: 20 }]}>{t('accessDeniedTitle') || 'Access Denied'}</Text>
        <TouchableOpacity
          style={{ marginTop: 30, padding: 15, backgroundColor: '#8C92AC', borderRadius: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('goBack') || 'Go Back'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('editOptions') || 'Edit Options'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Card 1: Edit Activities */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('AdminEditActivitiesScreen')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="fitness-outline" size={28} color="#1976D2" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{t('editActivities') || 'Edit Activities'}</Text>
            <Text style={styles.cardSubtitle}>{t('editActivitiesDesc') || 'Manage activity categories and options'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#888" />
        </TouchableOpacity>

        {/* Card 2: Edit Place Types */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('AdminEditPlaceTypesScreen')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="list-outline" size={28} color="#7B1FA2" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{t('editPlaceTypes') || 'Edit Place Types'}</Text>
            <Text style={styles.cardSubtitle}>{t('editPlaceTypesDesc') || 'Manage place type categories in Firestore'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#888" />
        </TouchableOpacity>

        {/* Card 3: Edit Genres */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('AdminEditGenresScreen')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="disc-outline" size={28} color="#2E7D32" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{t('editGenres') || 'Edit Genres'}</Text>
            <Text style={styles.cardSubtitle}>{t('editGenresDesc') || 'Manage music genres and options in Firestore'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#888" />
        </TouchableOpacity>

        {/* Card 4: Edit Artists */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('AdminEditArtistsScreen')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="person-outline" size={28} color="#E65100" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{t('editArtists') || 'Edit Artists'}</Text>
            <Text style={styles.cardSubtitle}>{t('editArtistsDesc') || 'Manage music artists and options in Firestore'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#888" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, fontFamily: 'serif' },
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
  content: { paddingHorizontal: 20, paddingTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, fontFamily: 'serif' },
  cardSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 2, fontFamily: 'serif' },
});
