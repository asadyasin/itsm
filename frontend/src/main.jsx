import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ColorModeProvider } from './contexts/ColorModeContext';
import { SocketProvider } from './contexts/SocketContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false }
  }
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Providers({ children }) {
  // Only wrap with GoogleOAuthProvider if a client ID is actually configured, so the app
  // still runs fine (just without the Google button) if it hasn't been set up yet.
  if (!googleClientId) return children;
  return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ColorModeProvider>
        <QueryClientProvider client={queryClient}>
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <AuthProvider>
              <SocketProvider>
                <Providers>
                  <App />
                </Providers>
              </SocketProvider>
            </AuthProvider>
          </SnackbarProvider>
        </QueryClientProvider>
      </ColorModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
