import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ColorModeProvider } from './contexts/ColorModeContext';
import { SocketProvider } from './contexts/SocketContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ColorModeProvider>
        <QueryClientProvider client={queryClient}>
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <AuthProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </AuthProvider>
          </SnackbarProvider>
        </QueryClientProvider>
      </ColorModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
