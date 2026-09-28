import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { globalStyles, COLORS } from '../styles/theme';
import { auth} from '../services/FirebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification,updateProfile } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const { t } = useLanguage();

  const resetFields = () => {
    setName(""); setEmail(""); setPassword(""); setConfirmPassword("");
  }

  const handleRegister = async () => {
      if (!name) { Alert.alert(t('error'), t('enterFullNameMsg')); return; }
      if (password !== confirmPassword) { Alert.alert(t('error'), t('passwordsNotMatchMsg')); return; }
    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth,email,password);
      await updateProfile(userCred.user, {
          displayName: name
      });
      await sendEmailVerification(userCred.user);
      await auth.signOut();
      Alert.alert(t('success'), t('userRegisteredMsg'), [{text: t('ok'), onPress: () => { resetFields(); navigation.goBack();}}]);
    } catch (error) {
      console.log(error.code);
      let errorMessage;
      switch (error.code) {
        case 'auth/invalid-email': errorMessage = t('invalidEmailFormatMsg'); break;
        case 'auth/missing-password': errorMessage = t('missingPasswordMsg'); break;
        case 'auth/email-already-in-use': errorMessage = t('emailInUseMsg'); break;
        case 'auth/weak-password': errorMessage = t('weakPasswordMsg'); break;
        default: errorMessage = t('networkErrorMsg'); break;
      } 
      Alert.alert(t('registrationFailed'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={globalStyles.container}>
      <View style={globalStyles.headerContainer}>
        <Text style={globalStyles.title}>{t('joinLumaTune')}</Text>
        <Text style={globalStyles.subtitle}>{t('setupProfile')}</Text>
      </View>

      <View style={globalStyles.formContainer}>
        <TextInput style={globalStyles.input} placeholder={t('fullNamePlaceholder')} placeholderTextColor="#888" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextInput style={globalStyles.input} placeholder={t('emailPlaceholder')} placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={globalStyles.input} placeholder={t('passwordPlaceholder')} placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={globalStyles.input} placeholder={t('confirmPasswordPlaceholder')} placeholderTextColor="#888" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <TouchableOpacity style={globalStyles.primaryButton} disabled={loading} onPress={handleRegister}>
          <Text style={globalStyles.buttonText}>{loading ? t('loading') : t('createAccount')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={globalStyles.linkContainer} onPress={() => navigation.navigate('Login')}>
          <Text style={globalStyles.linkText}>{t('alreadyHaveAccount')}<Text style={globalStyles.linkTextBold}>{t('login')}</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;