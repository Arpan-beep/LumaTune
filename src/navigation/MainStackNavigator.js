    import { createNativeStackNavigator } from "@react-navigation/native-stack";
    import MainNavigator from "./MainNavigator";
    import MapSelectionScreen from '../screens/MapSelectionScreen';
    import RecommendationScreen from '../screens/RecommendationScreen';
    import ReviewScreen from '../screens/ReviewScreen';
    import PlaceGalleryScreen from '../screens/PlaceGalleryScreen';
    import ViewReviewsScreen from '../screens/ViewReviewsScreen';
    import FavoriteLocationsScreen from '../screens/FavoriteLocationsScreen';
    import SavedPlaylistsScreen from '../screens/SavedPlaylistsScreen';

    // Admin Screens
    import AdminScreen from "../screens/admin/AdminRequestsScreen";
    import RequestDetailScreen from "../screens/admin/AdminRequestDetailScreen";
    import AdminPendingReviewsScreen from '../screens/admin/AdminPendingReviews';
    import AdminEditPlacesScreen from '../screens/admin/AdminEditPlaces';
    import AdminEditOptionsScreen from '../screens/admin/AdminEditOptions';
    import AdminEditPlaceTypesScreen from '../screens/admin/AdminEditPlaceTypes';
    import AdminEditActivitiesScreen from '../screens/admin/AdminEditActivities';
    import AdminEditGenresScreen from '../screens/admin/AdminEditGenres';
    import AdminEditArtistsScreen from '../screens/admin/AdminEditArtists';

const Stack = createNativeStackNavigator();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Main"
        component={MainNavigator}
      />
      <Stack.Screen
        name="AdminScreen"
        component={AdminScreen}
      />
      <Stack.Screen 
        name="AdminDetailScreen" 
        component={RequestDetailScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminEditPlacesScreen" 
        component={AdminEditPlacesScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminEditOptionsScreen" 
        component={AdminEditOptionsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminEditPlaceTypesScreen" 
        component={AdminEditPlaceTypesScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminEditActivitiesScreen" 
        component={AdminEditActivitiesScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminEditGenresScreen" 
        component={AdminEditGenresScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminEditArtistsScreen" 
        component={AdminEditArtistsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminPendingReviews" 
        component={AdminPendingReviewsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="MapSelectionScreen" 
        component={MapSelectionScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="RecommendationScreen" 
        component={RecommendationScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ReviewScreen" 
        component={ReviewScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="PlaceGallery"
        component={PlaceGalleryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ViewReviews"
        component={ViewReviewsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FavoriteLocations"
        component={FavoriteLocationsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="SavedPlaylistsScreen" 
        component={SavedPlaylistsScreen}
      />
    </Stack.Navigator>
  );
}