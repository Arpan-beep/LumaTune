import React from 'react';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@expo/vector-icons'; 

import HomeScreen from "../screens/HomeScreen";
import JournalScreen from "../screens/JournalScreen";
import PlaceSubmissionScreen from "../screens/PlaceSubmissionScreen";
import InputScreen from "../screens/InputScreen";
import MapScreen from "../screens/MapScreen";
import { useLanguage } from '../context/LanguageContext';

const Tab = createBottomTabNavigator();

function MainNavigator () {
    const {t} = useLanguage();
    return(
    <Tab.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        
        <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
                tabBarLabel: t('tabHome'), 
                tabBarIcon: ({ focused, color, size }) => (
                    <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
                )
            }}
        />
        
        <Tab.Screen 
            name="Input" 
            component={InputScreen}
            options={{
                tabBarLabel: t('tabInput'), 
                tabBarIcon: ({ focused, color, size }) => (
                    <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={size} color={color} />
                )
            }}
        />
        
        
        <Tab.Screen 
            name="Journal" 
            component={JournalScreen}
            options={{
                tabBarLabel: t('tabJournal'), 
                tabBarIcon: ({ focused, color, size }) => (
                    <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
                )
            }}
        />
        
        <Tab.Screen 
            name="Map" 
            component={MapScreen}
            options={{
                tabBarLabel: t('tabMap'), 
                tabBarIcon: ({ focused, color, size }) => (
                    <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
                )
            }}
        />

        <Tab.Screen 
            name="PlaceSubmissionScreen" 
            component={PlaceSubmissionScreen}
            options={{
                tabBarLabel: t('tabAddPlace'), 
                tabBarIcon: ({ focused, color, size }) => (
                    <Ionicons name={focused ? 'location' : 'location-outline'} size={size} color={color} />
                )
            }}
        />

    </Tab.Navigator>
    );
}

export default MainNavigator;