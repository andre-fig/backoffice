import { Box, CssBaseline, Toolbar } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import Sidebar from './components/Sidebar';
import ChatRedirectForm from './pages/chat-redirect';
import MetaLinesExportPage from './pages/meta-lines-export';
import AnalyticsPage from './pages/analytics';
import NxWelcome from './nx-welcome';

export function App() {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoHideDuration={4000}
      preventDuplicate
    >
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <Sidebar />
        <Box
          component="main"
          sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
        >
          <Toolbar />
          <Routes>
            <Route path="/" element={<NxWelcome title="admin-ui" />} />
            <Route path="/redirects/chats" element={<ChatRedirectForm />} />
            <Route path="/meta/lines/export" element={<MetaLinesExportPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </Box>
      </Box>
    </SnackbarProvider>
  );
}

export default App;
