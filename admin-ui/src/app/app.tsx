import { Box, CssBaseline, Toolbar } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import VacationRedirectForm from './pages/vacation-redirect';
import NxWelcome from './nx-welcome';

export function App() {
  return (
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
          <Route
            path="/redirects/vacation"
            element={<VacationRedirectForm />}
          />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
