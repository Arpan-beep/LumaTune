import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const COLORS = {
  background: '#F7F9FC',      // Soft off-white
  primary: '#5A8DF0',         // Focused blue
  secondary: '#88E2E8',       // Calming teal
  accent: '#F77070',          // Warm coral
  textDark: '#2D3748',        // Deep slate gray
  textLight: '#718096',       // Medium gray
  placeholder: '#888888',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

// Common reusable styles
export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SCREEN_WIDTH * 0.03, 
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.05, 
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SCREEN_HEIGHT * 0.018, 
    marginBottom: SCREEN_HEIGHT * 0.02,
    fontSize: 16,
    fontFamily: 'serif',
    color: COLORS.textDark,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: SCREEN_HEIGHT * 0.018,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  recommendationButton: {
    backgroundColor: COLORS.accent,
    padding: SCREEN_HEIGHT * 0.018,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.01,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  linkText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontFamily: 'serif',
  },
  linkTextBold: {
    color: COLORS.primary, 
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  linkContainer: {
    marginTop: SCREEN_HEIGHT * 0.025,
    alignItems: 'center',
    paddingVertical: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textDark, 
    marginBottom: SCREEN_HEIGHT * 0.01,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    fontFamily: 'serif',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  listItemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  listItemChevron: {
    fontSize: 20,
    color: COLORS.border,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 12,
    letterSpacing: 1,
  },
});