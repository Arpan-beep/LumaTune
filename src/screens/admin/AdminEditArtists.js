import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../services/FirebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS } from '../../styles/theme';

export default function AdminEditArtistsScreen({ navigation }) {
  const { userRole } = useAuth();
  const { t } = useLanguage();

  const [artists, setArtists] = useState([]);
  const [originalDocIds, setOriginalDocIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State for Adding / Editing Artist
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null = adding new item
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (userRole !== 'admin') return;
    fetchArtists();
  }, [userRole]);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'artists'));
      const list = [];
      const docIds = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        docIds.push(docSnap.id);
        list.push({
          id: docSnap.id,
          name: data.name || data.artistName || docSnap.id,
        });
      });

      setArtists(list);
      setOriginalDocIds(docIds);
    } catch (error) {
      console.error('Error fetching artists:', error);
      Alert.alert('Error', 'Failed to load artists from Firestore: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setEditName('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (index) => {
    const item = artists[index];
    setEditingIndex(index);
    setEditName(item.name || '');
    setModalVisible(true);
  };

  const handleSaveModal = () => {
    if (!editName.trim()) {
      Alert.alert('Incomplete Field', 'Please fill in the Artist Name field.');
      return;
    }

    const nameVal = editName.trim();

    if (editingIndex === null) {
      // Add new item
      const newItem = {
        id: nameVal.toLowerCase().replace(/\s+/g, '_') || `temp_${Date.now()}`,
        name: nameVal,
      };
      setArtists([...artists, newItem]);
    } else {
      // Update existing item
      const updated = [...artists];
      updated[editingIndex] = {
        ...updated[editingIndex],
        name: nameVal,
      };
      setArtists(updated);
    }

    setModalVisible(false);
    setEditingIndex(null);
  };

  const handleDeleteItem = (index) => {
    Alert.alert(
      'Delete Item',
      'Remove this artist from the draft list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = [...artists];
            updated.splice(index, 1);
            setArtists(updated);
          },
        },
      ]
    );
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const currentDocIds = artists.map((item) => item.id || item.name.toLowerCase().replace(/\s+/g, '_'));

      // 1. Delete documents that were removed from the draft list
      const docIdsToDelete = originalDocIds.filter((id) => !currentDocIds.includes(id));
      for (const docId of docIdsToDelete) {
        await deleteDoc(doc(db, 'artists', docId));
      }

      // 2. Save / Update all current draft items in Firestore
      for (const item of artists) {
        const docId = (item.id || item.name).trim().toLowerCase().replace(/\s+/g, '_');
        const docRef = doc(db, 'artists', docId);
        await setDoc(docRef, {
          name: item.name.trim(),
        });
      }

      Alert.alert('Success', 'Artists updated successfully in Firestore!');
      await fetchArtists(); // Refresh list from database
    } catch (error) {
      console.error('Error saving artists to Firestore:', error);
      Alert.alert('Error', 'Could not save changes to Firestore: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.headerText}>{t('editArtists') || 'Edit Artists'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8C92AC" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Add New Button */}
          <TouchableOpacity style={styles.addTypeHeaderBtn} onPress={handleOpenAddModal}>
            <Ionicons name="add-circle-outline" size={22} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.addTypeHeaderBtnText}>{t('addArtist') || '+ Add New Artist'}</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeaderTitle}>{t('artistsList') || 'Artists List'} ({artists.length})</Text>

          {/* Clean Name List Rendering */}
          {artists.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('noArtistsAvailable') || 'No artists available.'}</Text>
            </View>
          ) : (
            artists.map((item, index) => (
              <TouchableOpacity
                key={item.id || index}
                style={styles.itemRow}
                activeOpacity={0.7}
                onPress={() => handleOpenEditModal(index)}
              >
                <View style={styles.itemLeft}>
                  <Ionicons name="person-outline" size={22} color={COLORS.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => handleOpenEditModal(index)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={20} color="#4285F4" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteItem(index)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Submit & Save to Firestore Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={22} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>{t('saveChanges') || 'Submit & Save to Firestore'}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Edit / Add Modal Popup */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingIndex === null ? (t('addArtist') || 'Add New Artist') : (t('editArtistFields') || 'Edit Artist Fields')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('artistName') || 'Artist Name'}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ODESZA"
                placeholderTextColor="#888"
                value={editName}
                onChangeText={setEditName}
              />

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveModal}>
                <Text style={styles.modalSaveBtnText}>
                  {editingIndex === null ? (t('addToDraftList') || 'Add to Draft List') : (t('doneAndUpdate') || 'Done & Update Item')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  addTypeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary || '#5A8DF0',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  addTypeHeaderBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 14, fontFamily: 'serif' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, fontFamily: 'serif' },
  itemActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  actionBtn: { padding: 6, marginLeft: 4 },
  emptyCard: {
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { color: '#888', fontSize: 14 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1EAE58',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
    elevation: 4,
    shadowColor: '#1EAE58',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, fontFamily: 'serif' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 10, marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    color: '#333',
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary || '#5A8DF0',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  modalSaveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
