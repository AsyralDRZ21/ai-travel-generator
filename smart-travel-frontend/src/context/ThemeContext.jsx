import { createContext, useContext } from 'react';

const ThemeContext = createContext();

// Single light theme — no dark mode
export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
