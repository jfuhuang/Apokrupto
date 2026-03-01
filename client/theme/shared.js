import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { fonts } from './typography';

export const sharedStyles = StyleSheet.create({
  screenHeader: {
    flexDirection:       'row',
    alignItems:          'center',
    paddingHorizontal:   20,
    paddingVertical:     12,
    borderBottomWidth:   1,
    borderBottomColor:   colors.border.default,
  },
  sectionLabel: {
    fontFamily:   fonts.display.bold,
    fontSize:     10,
    letterSpacing: 2,
    color:        colors.text.tertiary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.background.panel,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border.default,
    padding:         14,
  },
  timerText: {
    fontFamily:    fonts.display.bold,
    fontSize:      28,
    letterSpacing: 3,
    textAlign:     'center',
  },
});
