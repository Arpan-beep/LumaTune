import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { COLORS } from '../styles/theme';

const CustomDropdown = ({ 
  value, 
  setValue, 
  data, 
  placeholder, 
  containerStyle, 
  dropdownStyle,
  placeholderStyle,
  selectedTextStyle
}) => {
  const [isFocus, setIsFocus] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Dropdown
        style={[
          styles.dropdown, 
          isFocus && { borderColor: COLORS.primary }, 
          dropdownStyle
        ]}
        placeholderStyle={[styles.placeholderStyle, placeholderStyle]}
        selectedTextStyle={[styles.selectedTextStyle, selectedTextStyle]}
        inputSearchStyle={styles.inputSearchStyle}
        iconStyle={styles.iconStyle}
        data={data}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={!isFocus ? (placeholder || 'Select item') : '...'}
        searchPlaceholder="Search..."
        value={value}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          setValue(item.value);
          setIsFocus(false);
        }}
      />
    </View>
  );
};

export default CustomDropdown;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 10,
  },
  dropdown: {
    minHeight: 52,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
  },
  placeholderStyle: {
    fontSize: 14,
    color: COLORS.placeholder,
    fontFamily: 'serif',
  },
  selectedTextStyle: {
    fontSize: 15,
    color: COLORS.textDark,
    fontFamily: 'serif',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 15,
  },
});
