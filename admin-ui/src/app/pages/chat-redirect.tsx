import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, FormControl } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { RedirectChatsDto } from '@backoffice-monorepo/shared-types';

interface User {
  id: string;
  name: string;
}

const ChatRedirectForm = () => {
  const [usersSaida, setUsersSaida] = useState<User[]>([]);
  const [usersDestino, setUsersDestino] = useState<User[]>([]);
  const [formData, setFormData] = useState<RedirectChatsDto>({
    sourceUserId: '',
    destinationUserId: '',
  });

  const [searchSaida, setSearchSaida] = useState<string>('');
  const [searchDestino, setSearchDestino] = useState<string>('');
  const [loadingSaida, setLoadingSaida] = useState(false);
  const [loadingDestino, setLoadingDestino] = useState(false);

  useEffect(() => {
    let mounted = true;
    let debounce: NodeJS.Timeout | null = null;

    const fetchUsersSaida = async (filter?: string) => {
      setLoadingSaida(true);
      try {
        const params = new URLSearchParams();
        if (filter) params.set('filter', filter);
        params.set('direction', 'next');
        params.set('perPage', '50');

        const res = await fetch(`/api/vdi/users?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const list: User[] = (body?.data || []).map((u: unknown) => {
          const obj = u as { id?: string; name?: string };
          return { id: String(obj.id ?? ''), name: String(obj.name ?? '') };
        });
        if (mounted) setUsersSaida(list);
      } catch (err) {
        console.error('Failed to fetch users (saida)', err);
      } finally {
        if (mounted) setLoadingSaida(false);
      }
    };

    debounce = setTimeout(
      () => fetchUsersSaida(searchSaida || undefined),
      searchSaida ? 500 : 300
    );

    return () => {
      mounted = false;
      if (debounce) clearTimeout(debounce);
    };
  }, [searchSaida]);

  useEffect(() => {
    let mounted = true;
    let debounce: NodeJS.Timeout | null = null;

    const fetchUsersDestino = async (filter?: string) => {
      setLoadingDestino(true);
      try {
        const params = new URLSearchParams();
        if (filter) params.set('filter', filter);
        params.set('direction', 'next');
        params.set('perPage', '50');

        const res = await fetch(`/api/vdi/users?${params.toString()}`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const body = await res.json();
        const list: User[] = (body?.data || []).map((u: unknown) => {
          const obj = u as { id?: string; name?: string };
          return { id: String(obj.id ?? ''), name: String(obj.name ?? '') };
        });
        if (mounted) setUsersDestino(list);
      } catch (err) {
        console.error('Failed to fetch users (destino)', err);
      } finally {
        if (mounted) setLoadingDestino(false);
      }
    };

    debounce = setTimeout(
      () => fetchUsersDestino(searchDestino || undefined),
      searchDestino ? 500 : 300
    );

    return () => {
      mounted = false;
      if (debounce) clearTimeout(debounce);
    };
  }, [searchDestino]);

  const handleSelectSaida = (_: unknown, user: User | null) => {
    setFormData((prev) => ({ ...prev, sourceUserId: user?.id ?? '' }));
  };

  const handleSelectDestino = (_: unknown, user: User | null) => {
    setFormData((prev) => ({ ...prev, destinationUserId: user?.id ?? '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/redirects/chats', {
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
      <Typography variant="h6">Redirecionar Conversas</Typography>
      <FormControl fullWidth margin="normal">
        <Autocomplete
          options={usersSaida}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          filterOptions={(x) => x}
          loading={loadingSaida}
          onChange={handleSelectSaida}
          onInputChange={(e, value) => setSearchSaida(value)}
          value={usersSaida.find((u) => u.id === formData.sourceUserId) || null}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Usuário de Origem"
              placeholder="Digite para buscar"
              required
            />
          )}
        />
      </FormControl>
      <FormControl fullWidth margin="normal">
        <Autocomplete
          options={usersDestino}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          filterOptions={(x) => x}
          loading={loadingDestino}
          onChange={handleSelectDestino}
          onInputChange={(e, value) => setSearchDestino(value)}
          value={
            usersDestino.find((u) => u.id === formData.destinationUserId) ||
            null
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Usuário de Destino"
              placeholder="Digite para buscar"
              required
            />
          )}
        />
      </FormControl>
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
        Executar Redirecionamento
      </Button>
    </Box>
  );
};

export default ChatRedirectForm;
