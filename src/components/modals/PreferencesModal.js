import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS } from '../../styles/theme';

const PreferencesModal = ({
  visible,
  onClose,
  favoriteGenres = [],
  onSelectGenre,
  onRemoveGenre,
  availableGenres = [],
  favoriteArtists = [],
  onSelectArtist,
  onRemoveArtist,
  availableArtists = [],
  isInstrumentalOnly,
  setIsInstrumentalOnly,
  isWheelchairAccessible,
  setIsWheelchairAccessible,
  onSave,
  isUpdating
}) => {
  const { t } = useLanguage();
  const [genreSearch, setGenreSearch] = useState('');
  const [artistSearch, setArtistSearch] = useState('');

  const handleSelectGenreAndClear = (genre) => {
    onSelectGenre(genre);
    setGenreSearch('');
  };

  const handleSelectArtistAndClear = (artist) => {
    onSelectArtist(artist);
    setArtistSearch('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '95%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{t('musicPreferencesTitle')}</Text>

            {/* Genres Section */}
            <Text style={styles.inputLabel}>{t('favoriteGenresLabel')}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder={t('searchGenresPlaceholder')}
              placeholderTextColor={COLORS.textLight}
              value={genreSearch}
              onChangeText={setGenreSearch}
            />

            {/* Live Suggestions Dropdown */}
            {genreSearch.trim().length > 0 && (
              <View style={styles.suggestionBox}>
                {availableGenres
                  .filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()) && !favoriteGenres.includes(g))
                  .slice(0, 5)
                  .map(genre => (
                    <TouchableOpacity
                      key={genre}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectGenreAndClear(genre)}
                    >
                      <Text style={styles.suggestionText}>+ {genre}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* Selected Genre Chips */}
            <View style={styles.chipContainer}>
              {favoriteGenres.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={[styles.chip, styles.chipSelected]}
                  onPress={() => onRemoveGenre(genre)}
                >
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{genre} ✕</Text>
                </TouchableOpacity>
              ))}

              {favoriteGenres.length === 0 && (
                <Text style={styles.settingDescription}>{t('noGenresSelected')}</Text>
              )}
            </View>

            {/* Artists Section */}
            <Text style={[styles.inputLabel, { marginTop: 20 }]}>{t('favoriteArtistsLabel')}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder={t('searchArtistsPlaceholder')}
              placeholderTextColor={COLORS.textLight}
              value={artistSearch}
              onChangeText={setArtistSearch}
            />

            {/* Live Suggestions Dropdown */}
            {artistSearch.trim().length > 0 && (
              <View style={styles.suggestionBox}>
                {availableArtists
                  .filter(a => a.toLowerCase().includes(artistSearch.toLowerCase()) && !favoriteArtists.includes(a))
                  .slice(0, 5)
                  .map(artist => (
                    <TouchableOpacity
                      key={artist}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectArtistAndClear(artist)}
                    >
                      <Text style={styles.suggestionText}>+ {artist}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* Selected Artist Chips */}
            <View style={styles.chipContainer}>
              {favoriteArtists.map(artist => (
                <TouchableOpacity
                  key={artist}
                  style={styles.removableChip}
                  onPress={() => onRemoveArtist(artist)}
                >
                  <Text style={styles.removableChipText}>{artist} ✕</Text>
                </TouchableOpacity>
              ))}
              {favoriteArtists.length === 0 && (
                <Text style={styles.settingDescription}>{t('noArtistsAdded')}</Text>
              )}
            </View>

            {/* Instrumental Toggle */}
            <View style={[styles.switchRow, { marginTop: 25 }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.inputLabel}>{t('instrumentalOnlyLabel')}</Text>
                <Text style={styles.settingDescription}>{t('instrumentalOnlyDesc')}</Text>
              </View>
              <Switch
                value={isInstrumentalOnly}
                onValueChange={setIsInstrumentalOnly}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            {/* Wheelchair Accessible Toggle */}
            <View style={[styles.switchRow, { marginTop: 15 }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.inputLabel}>{t('wheelchairAccessibleLabel')}</Text>
                <Text style={styles.settingDescription}>{t('wheelchairAccessibleDesc')}</Text>
              </View>
              <Switch
                value={isWheelchairAccessible}
                onValueChange={setIsWheelchairAccessible}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>{t('cancelButton')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={onSave}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('saveButton')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'serif',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 8,
  },
  suggestionBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 4,
    marginBottom: 10,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  removableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  removableChipText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    marginRight: 10,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PreferencesModal;
