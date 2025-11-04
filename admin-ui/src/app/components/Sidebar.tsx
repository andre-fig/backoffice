import * as React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
} from '@mui/material';
import { Link } from 'react-router-dom';

const drawerWidth = 240;

const Sidebar = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          <ListItem key="chat-redirect" disablePadding>
            <ListItemButton component={Link} to="/redirects/chats">
              <ListItemText primary="Redirecionar de Conversas" />
            </ListItemButton>
          </ListItem>
          <ListItem key="meta-lines-export" disablePadding>
            <ListItemButton component={Link} to="/meta/lines/export">
              <ListItemText primary="Exportar Linhas da Meta" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
