import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ColorModeContext = createContext({ toggleColorMode: () => {}, mode: 'light' });

export function useColorMode() {
  return useContext(ColorModeContext);
}

// Corporate palette: deep indigo primary, teal accent — professional, not templated defaults.
function buildTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#2B3A67', light: '#4A5A8F', dark: '#1B2645' },
      secondary: { main: '#1F8A70' },
      background: {
        default: mode === 'light' ? '#F4F6F9' : '#0F1420',
        paper: mode === 'light' ? '#FFFFFF' : '#161C2C'
      },
      error: { main: '#C0392B' },
      warning: { main: '#D68910' },
      success: { main: '#1F8A70' }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 }
    },
    shape: { borderRadius: 10 },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: { styleOverrides: { root: { boxShadow: '0 1px 3px rgba(15, 20, 32, 0.08)' } } },
      MuiAppBar: { styleOverrides: { root: { boxShadow: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)' } } }
    }
  });
}

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('itsm-theme-mode') || 'light');

  useEffect(() => {
    localStorage.setItem('itsm-theme-mode', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
    }),
    [mode]
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
