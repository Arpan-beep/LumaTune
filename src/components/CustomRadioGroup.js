import React from "react";
import { View, TouchableOpacity, Text ,StyleSheet} from "react-native";

export const RadioGroup = ({ options, selectedValue, onValueChange }) => {
  const handlePress = (optionValue) => {
    if (selectedValue === optionValue) {
      onValueChange(null);
    } else {
      onValueChange(optionValue);
    }
  };

  return (
    <View style={styles.radioContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={styles.radioOption}
          onPress={() => handlePress(option.value)}
        >
          <View style={styles.radioCircle}>
            {selectedValue === option.value && <View style={styles.selectedRadioCircle} />}
          </View>
          <Text style={styles.radioText}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const styles = StyleSheet.create({
    radioContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    radioOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CCC', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, flex: 1, marginHorizontal: 4, backgroundColor: '#FAFAFA' },
    radioCircle: { height: 16, width: 16, borderRadius: 8, borderWidth: 1, borderColor: '#444', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    selectedRadioCircle: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#444' },
    radioText: { fontSize: 12 },
})