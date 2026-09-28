import en from '../translations/en.json';
import pt from '../translations/pt.json';
import { createContext,useContext,useState,useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';



const translations = {en,pt};

export const LanguageContext = createContext();

export const LanguageProvider = ({children}) => {
    const [language, setLanguage] = useState('en');
    useEffect(() => {
        const loadSavedLanguage = async () => {
            const savedLang = await AsyncStorage.getItem('user_language');
            if (savedLang) setLanguage(savedLang);
        };
        loadSavedLanguage();
    }, []);

    const t = (key) => translations[language]?.[key] || key;

    const changeLanguage = async (newLang) => {
        const resolvedLang = typeof newLang === 'function' ? newLang(language) : newLang;
        setLanguage(resolvedLang);
        await AsyncStorage.setItem('user_language', resolvedLang);

    };

    return(
        <LanguageContext.Provider value={{language,setLanguage:changeLanguage,t}}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);

