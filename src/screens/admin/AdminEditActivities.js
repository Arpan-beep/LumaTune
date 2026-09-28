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

export default function AdminEditActivitiesScreen({ navigation }) {
  const { userRole } = useAuth();
  const { t, language } = useLanguage();

  const [activities, setActivities] = useState([]);
  const [originalDocIds, setOriginalDocIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State for Adding / Editing Activity
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null = adding new item
  const [editLabelEn, setEditLabelEn] = useState('');
  const [editLabelPt, setEditLabelPt] = useState('');
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (userRole !== 'admin') return;
    fetchActivities();
  }, [userRole]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'activities'));
      const list = [];
      const docIds = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        docIds.push(docSnap.id);
        list.push({
          id: docSnap.id,
          label_en: data.label_en || data.name || data.label || '',
          label_pt: data.label_pt || data.name || data.label || '',
          value: data.value || docSnap.id,
        });
      });

      setActivities(list);
      setOriginalDocIds(docIds);
    } catch (error) {
      console.error('Error fetching activities:', error);
      Alert.alert('Error', 'Failed to load activities from Firestore: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setEditLabelEn('');
    setEditLabelPt('');
    setEditValue('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (index) => {
    const item = activities[index];
    setEditingIndex(index);
    setEditLabelEn(item.label_en || '');
    setEditLabelPt(item.label_pt || '');
    setEditValue(item.value || '');
    setModalVisible(true);
  };

  const handleSaveModal = () => {
    if (!editLabelEn.trim() || !editLabelPt.trim() || !editValue.trim()) {
      Alert.alert('Incomplete Fields', 'Please fill in all 3 fields: English Label, Portuguese Label, and Value.');
      return;
    }

    const cleanValue = editValue.trim().toLowerCase().replace(/\s+/g, '_');

    if (editingIndex === null) {
      // Add new activity
      const newItem = {
        id: cleanValue || `temp_${Date.now()}`,
        label_en: editLabelEn.trim(),
        label_pt: editLabelPt.trim(),
        value: cleanValue,
      };
      setActivities([...activities, newItem]);
    } else {
      // Update existing activity
      const updated = [...activities];
      updated[editingIndex] = {
        ...updated[editingIndex],
        label_en: editLabelEn.trim(),
        label_pt: editLabelPt.trim(),
        value: cleanValue,
      };
      setActivities(updated);
    }

    setModalVisible(false);
    setEditingIndex(null);
  };

  const handleDeleteItem = (index) => {
    Alert.alert(
      'Delete Item',
      'Remove this activity from the draft list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = [...activities];
            updated.splice(index, 1);
            setActivities(updated);
          },
        },
      ]
    );
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const currentDocIds = activities.map((item) => item.value || item.id);

      // 1. Delete documents that were removed from the draft list
      const docIdsToDelete = originalDocIds.filter((id) => !currentDocIds.includes(id));
      for (const docId of docIdsToDelete) {
        await deleteDoc(doc(db, 'activities', docId));
      }

      // 2. Save / Update all current draft items in Firestore
      for (const item of activities) {
        const docId = (item.value || item.id).trim().toLowerCase().replace(/\s+/g, '_');
        const docRef = doc(db, 'activities', docId);
        await setDoc(docRef, {
          label_en: item.label_en.trim(),
          label_pt: item.label_pt.trim(),
          value: docId,
        });
      }

      Alert.alert('Success', 'Activities updated successfully in Firestore!');
      await fetchActivities(); // Refresh list from database
    } catch (error) {
      console.error('Error saving activities to Firestore:', error);
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
        <Text style={styles.headerText}>{t('editActivities') || 'Edit Activities'}</Text>
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
            <Text style={styles.addTypeHeaderBtnText}>{t('addActivity')}</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeaderTitle}>{t('activitiesList')} ({activities.length})</Text>

          {/* Clean Label List Rendering */}
          {activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('noActivitiesAvailable')}</Text>
            </View>
          ) : (
            activities.map((item, index) => {
              const displayLabel = language === 'pt'
                ? (item.label_pt || item.label_en || item.value)
                : (item.label_en || item.label_pt || item.value);

              return (
                <TouchableOpacity
                  key={item.id || index}
                  style={styles.itemRow}
                  activeOpacity={0.7}
                  onPress={() => handleOpenEditModal(index)}
                >
                  <View style={styles.itemLeft}>
                    <Ionicons name="fitness-outline" size={22} color="#1976D2" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{displayLabel}</Text>
                      <Text style={styles.itemSubValue}>value: {item.value}</Text>
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
              );
            })
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
                <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
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
                {editingIndex === null ? t('addActivity') : t('editActivityFields')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('englishLabel')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Studying"
                placeholderTextColor="#888"
                value={editLabelEn}
                onChangeText={setEditLabelEn}
              />

              <Text style={styles.inputLabel}>{t('portugueseLabel')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Estudar"
                placeholderTextColor="#888"
                value={editLabelPt}
                onChangeText={setEditLabelPt}
              />

              <Text style={styles.inputLabel}>{t('valueIdentifier')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. studying"
                placeholderTextColor="#888"
                value={editValue}
                onChangeText={setEditValue}
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveModal}>
                <Text style={styles.modalSaveBtnText}>
                  {editingIndex === null ? t('addToDraftList') : t('doneAndUpdate')}
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
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#1976D2',
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
  itemSubValue: { fontSize: 12, color: '#888', marginTop: 2 },
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
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  modalSaveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
