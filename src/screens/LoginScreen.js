import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { globalStyles, COLORS } from '../styles/theme';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/FirebaseConfig';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const {setUserToken} = useAuth();
  const {t,setLanguage,language} = useLanguage();

  const create_User_In_Database = async(user) => {
    const userRef = doc(db,"users",user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      await updateDoc(userRef,{ lastLogin: serverTimestamp() });
    } else {
      await setDoc(userRef,{
          id : user.uid,
          email : user.email,
          displayName: user.displayName,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
      });
    }
  }

  const handleLogin = async () => {
    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(auth,email,password);
      if(userCred.user.emailVerified){
        await create_User_In_Database(userCred.user);
        setUserToken(userCred.user.uid);
      } else {
        auth.signOut();
        Alert.alert(t('userNotVerifiedTitle'), t('verifyEmailMsg'));
        setPassword("");
      }
    } catch (error) {
      console.log(error.code);
      let alertMessage;
      switch(error.code){
        case 'auth/invalid-email': alertMessage = t('invalidEmailFormatMsg'); break;
        case 'auth/missing-password': alertMessage = t('missingPasswordMsg'); break;
        case 'auth/invalid-credential': alertMessage = t('invalidCredentialMsg'); break;
        default:
          alertMessage = t('networkErrorMsg');
          break;
      }
      auth.signOut();
      Alert.alert(t('somethingWentWrong'), alertMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={globalStyles.container}>
      <View style={globalStyles.headerContainer}>
        <Text style={globalStyles.title}>LumaTune</Text>
        <Text style={globalStyles.subtitle}>{t('loginSubtitle')}</Text>
      </View>

      <View style={globalStyles.formContainer}>
        <TextInput
          style={globalStyles.input}
          placeholder={t('emailPlaceholder')}
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={globalStyles.input}
          placeholder={t('passwordPlaceholder')}
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={globalStyles.primaryButton} onPress={handleLogin} disabled={loading}>
          <Text style={globalStyles.buttonText}>{ loading ? t('loading') : t('login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={globalStyles.linkContainer} 
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={globalStyles.linkText}>{t('dontHaveAccount')}<Text style={globalStyles.linkTextBold}>{t('signUp')}</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
export default LoginScreen;