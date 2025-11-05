import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Select,
  MenuItem,
  InputLabel,
  TableSortLabel,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import DeleteIcon from '@mui/icons-material/Delete';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { RedirectListResponseDto } from '@backoffice-monorepo/shared-types';
import { useToast } from '../hooks/useToast';

interface User {
  id: string;
  name: string;
}

interface Sector {
  code: string;
  name: string;
}

type SortOrder = 'asc' | 'desc';
type SortableColumn = 'status' | 'sectorName' | 'sourceUserName' | 'destinationUserName' | 'startDate' | 'endDate';

const ChatRedirectForm = () => {
  const toast = useToast();
  const [redirects, setRedirects] = useState<RedirectListResponseDto[]>([]);
  const [loadingRedirects, setLoadingRedirects] = useState(false);
  const [sortBy, setSortBy] = useState<SortableColumn>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [usersSaida, setUsersSaida] = useState<User[]>([]);
  const [usersDestino, setUsersDestino] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  
  const [selectedSourceUser, setSelectedSourceUser] = useState<User | null>(null);
  const [selectedDestinationUser, setSelectedDestinationUser] = useState<User | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const [searchSaida, setSearchSaida] = useState<string>('');
  const [searchDestino, setSearchDestino] = useState<string>('');
  const [loadingSaida, setLoadingSaida] = useState(false);
  const [loadingDestino, setLoadingDestino] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);

  useEffect(() => {
    fetchRedirects();
  }, []);

  const fetchRedirects = async () => {
    setLoadingRedirects(true);
    try {
      const res = await fetch('/api/redirects');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRedirects(data);
    } catch (err) {
      console.error('Failed to fetch redirects', err);
      toast.error('Erro ao carregar redirecionamentos.');
    } finally {
      setLoadingRedirects(false);
    }
  };

  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedRedirects = useMemo(() => {
    const statusOrder = { active: 0, scheduled: 1 };

    return [...redirects].sort((a, b) => {
      let aValue: string | number | Date | null = a[sortBy];
      let bValue: string | number | Date | null = b[sortBy];

      if (sortBy === 'status') {
        aValue = statusOrder[a.status as keyof typeof statusOrder] ?? 2;
        bValue = statusOrder[b.status as keyof typeof statusOrder] ?? 2;
      } else if (sortBy === 'startDate' || sortBy === 'endDate') {
        aValue = a[sortBy] ? new Date(a[sortBy] as Date).getTime() : 0;
        bValue = b[sortBy] ? new Date(b[sortBy] as Date).getTime() : 0;
      } else if (sortBy === 'sourceUserName') {
        aValue = a.sourceUserName || a.sourceUserId || '';
        bValue = b.sourceUserName || b.sourceUserId || '';
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'pt-BR', { numeric: true });
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [redirects, sortBy, sortOrder]);

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

  useEffect(() => {
    if (selectedSourceUser) {
      fetchUserSectors(selectedSourceUser.id);
    } else {
      setSectors([]);
      setSelectedSector('');
    }
  }, [selectedSourceUser]);

  const fetchUserSectors = async (userId: string) => {
    setLoadingSectors(true);
    try {
      const res = await fetch(`/api/redirects/users/${userId}/sectors`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSectors(data);
    } catch (err) {
      console.error('Failed to fetch sectors', err);
      toast.error('Erro ao carregar setores do usuário.');
    } finally {
      setLoadingSectors(false);
    }
  };

  const handleSelectSaida = (_: unknown, user: User | null) => {
    setSelectedSourceUser(user);
  };

  const handleSelectDestino = (_: unknown, user: User | null) => {
    setSelectedDestinationUser(user);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const [startDate, endDate] = dateRange;
    
    if (!selectedSourceUser || !selectedDestinationUser || !selectedSector || !startDate) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (endDate && endDate <= startDate) {
      toast.error('A data de fim deve ser maior que a data de início.');
      return;
    }

    try {
      const response = await fetch('/api/redirects/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceUserId: selectedSourceUser.id,
          destinationUserId: selectedDestinationUser.id,
          sectorCode: selectedSector,
          startDate: startDate.toISOString(),
          endDate: endDate ? endDate.toISOString() : null,
        }),
      });

      if (response.ok) {
        toast.success('Redirecionamento agendado com sucesso!');
        setSelectedSourceUser(null);
        setSelectedDestinationUser(null);
        setSelectedSector('');
        setDateRange([null, null]);
        fetchRedirects();
      } else {
        const error = await response.json();
        toast.error(`Falha ao agendar o redirecionamento: ${error.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      toast.error('Erro de rede.');
    }
  };

  const handleRemoveRedirect = async (redirect: RedirectListResponseDto) => {
    if (!confirm(`Deseja realmente remover este redirecionamento?`)) {
      return;
    }

    try {
      const isScheduled = redirect.status === 'scheduled';
      const response = await fetch(`/api/redirects/${redirect.id}?scheduled=${isScheduled}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Redirecionamento removido com sucesso!');
        fetchRedirects();
      } else {
        toast.error('Falha ao remover o redirecionamento.');
      }
    } catch (error) {
      console.error('Erro ao remover redirecionamento:', error);
      toast.error('Erro de rede.');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Painel de Redirecionamentos
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Gerencie os redirecionamentos de conversas entre usuários
        </Typography>

        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Redirecionamentos Ativos
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {redirects.length} redirecionamento(s) ativo(s)
          </Typography>

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'status'}
                      direction={sortBy === 'status' ? sortOrder : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'sectorName'}
                      direction={sortBy === 'sectorName' ? sortOrder : 'asc'}
                      onClick={() => handleSort('sectorName')}
                    >
                      Setor
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'sourceUserName'}
                      direction={sortBy === 'sourceUserName' ? sortOrder : 'asc'}
                      onClick={() => handleSort('sourceUserName')}
                    >
                      Usuário de Origem
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'destinationUserName'}
                      direction={sortBy === 'destinationUserName' ? sortOrder : 'asc'}
                      onClick={() => handleSort('destinationUserName')}
                    >
                      Usuário de Destino
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'startDate'}
                      direction={sortBy === 'startDate' ? sortOrder : 'asc'}
                      onClick={() => handleSort('startDate')}
                    >
                      Data de Início
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'endDate'}
                      direction={sortBy === 'endDate' ? sortOrder : 'asc'}
                      onClick={() => handleSort('endDate')}
                    >
                      Data de Fim
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingRedirects ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : sortedRedirects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Nenhum redirecionamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRedirects.map((redirect) => (
                    <TableRow key={redirect.id}>
                      <TableCell>
                        <Chip
                          label={redirect.status === 'active' ? 'Ativo' : 'Agendado'}
                          color={redirect.status === 'active' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{redirect.sectorName}</TableCell>
                      <TableCell>
                        {redirect.sourceUserName || redirect.sourceUserId || '-'}
                      </TableCell>
                      <TableCell>{redirect.destinationUserName}</TableCell>
                      <TableCell>{formatDate(redirect.startDate)}</TableCell>
                      <TableCell>{formatDate(redirect.endDate)}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveRedirect(redirect)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Adicionar Novo Redirecionamento
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selecione os usuários e a data de fim do redirecionamento
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <Autocomplete
                  fullWidth
                  options={usersSaida}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  filterOptions={(x) => x}
                  loading={loadingSaida}
                  onChange={handleSelectSaida}
                  onInputChange={(e, value) => setSearchSaida(value)}
                  value={selectedSourceUser}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Usuário de Origem"
                      placeholder="Origem"
                      required
                    />
                  )}
                />
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="sector-label">Setor</InputLabel>
                <Select
                  fullWidth
                  labelId="sector-label"
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  label="Setor"
                  required
                  disabled={!selectedSourceUser || loadingSectors}
                >
                  {sectors.map((sector) => (
                    <MenuItem key={sector.code} value={sector.code}>
                      {sector.name} ({sector.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <Autocomplete
                  fullWidth
                  options={usersDestino}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  filterOptions={(x) => x}
                  loading={loadingDestino}
                  onChange={handleSelectDestino}
                  onInputChange={(e, value) => setSearchDestino(value)}
                  value={selectedDestinationUser}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Usuário de Destino"
                      placeholder="Destino"
                      required
                    />
                  )}
                />
              </FormControl>

              <FormControl fullWidth>
                <DateRangePicker
                  value={dateRange}
                  onChange={(newValue) => setDateRange(newValue)}
                  localeText={{ start: 'Data de Início', end: 'Data de Fim' }}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      placeholder: 'dd/mm/yyyy',
                    },
                  }}
                />
              </FormControl>
            </Box>

            <Button type="submit" variant="contained" color="primary">
              Adicionar Redirecionamento
            </Button>
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default ChatRedirectForm;
