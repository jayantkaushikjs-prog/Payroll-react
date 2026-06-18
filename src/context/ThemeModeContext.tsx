import { createContext, useContext } from 'react';

interface ThemeModeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

