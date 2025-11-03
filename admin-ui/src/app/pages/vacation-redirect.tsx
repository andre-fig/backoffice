import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { RedirectVacationDto } from '@backoffice-monorepo/shared-types';

// Mock user type
interface User {
  id: string;
  name: string;
}

const VacationRedirectForm = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<RedirectVacationDto>({
    userIdSaida: '',
    userIdDestino: '',
    codigoSetor: '',
  });

  useEffect(() => {
    // Mock API call to fetch users
    const fetchUsers = async () => {
      // In a real app, you would fetch from '/api/users'
      const mockUsers: User[] = [
        { id: 'user1', name: 'Alice' },
        { id: 'user2', name: 'Bob' },
        { id: 'user3', name: 'Charlie' },
      ];
      setUsers(mockUsers);
    };

    fetchUsers();
  }, []);

  const handleSelectChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/redirects/vacation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Redirecionamento executado com sucesso!');
      } else {
        alert('Falha ao executar o redirecionamento.');
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      alert('Erro de rede.');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      <Typography variant="h6">Redirecionamento de Férias</Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel id="user-saida-label">Usuário de Saída (Férias)</InputLabel>
        <Select
          labelId="user-saida-label"
          name="userIdSaida"
          value={formData.userIdSaida}
          onChange={handleSelectChange}
          required
        >
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel id="user-destino-label">
          Usuário de Destino (Focal)
        </InputLabel>
        <Select
          labelId="user-destino-label"
          name="userIdDestino"
          value={formData.userIdDestino}
          onChange={handleSelectChange}
          required
        >
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        name="codigoSetor"
        label="Código do Setor (Opcional)"
        value={formData.codigoSetor}
        onChange={handleTextChange}
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
        Executar Redirecionamento
      </Button>
    </Box>
  );
};

export default VacationRedirectForm;
