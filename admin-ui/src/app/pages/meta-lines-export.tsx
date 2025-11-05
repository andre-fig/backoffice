import { useState, useEffect, useRef } from 'react';
import {
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Box,
  Chip,
  TableSortLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  TextField,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useToast } from '../hooks/useToast';
import { useSortable } from '../hooks/useSortable';
import {
  MetaLineRowDto,
  MetaLinesStreamEvent,
  ImWabaDto,
  Waba,
} from '@backoffice-monorepo/shared-types';

type SortableColumn =
  | 'id'
  | 'line'
  | 'wabaId'
  | 'wabaName'
  | 'name'
  | 'active'
  | 'verified'
  | 'qualityRating';

export default function MetaLinesExportPage() {
  const toast = useToast();
  const [rows, setRows] = useState<MetaLineRowDto[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [imWabas, setImWabas] = useState<ImWabaDto[]>([]);
  const [availableWabas, setAvailableWabas] = useState<Waba[]>([]);
  const [isLoadingWabas, setIsLoadingWabas] = useState(true);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [wabaSearchTerm, setWabaSearchTerm] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const {
    sortBy,
    sortOrder,
    handleSort,
    sortedData: sortedRows,
  } = useSortable(rows, {
    initialColumn: 'id' as SortableColumn,
    columns: {
      id: {
        accessor: (r) => r.id,
      },
      line: {
        accessor: (r) => r.line,
      },
      wabaId: {
        accessor: (r) => r.wabaId,
      },
      wabaName: {
        accessor: (r) => r.wabaName,
      },
      name: {
        accessor: (r) => r.name,
      },
      active: {
        accessor: (r) => r.active,
        type: 'enum',
        orderMap: {
          CONNECTED: 6,
          PENDING: 5,
          FLAGGED: 4,
          MIGRATED: 3,
          DISCONNECTED: 2,
          UNKNOWN: 1,
        },
      },
      verified: {
        accessor: (r) => r.verified,
        type: 'enum',
        orderMap: {
          Sim: 1,
          Não: 0,
        },
      },
      qualityRating: {
        accessor: (r) => r.qualityRating,
        type: 'enum',
        orderMap: {
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
          UNKNOWN: 0,
        },
      },
    },
  });

  useEffect(() => {
    loadImWabas();
    loadAvailableWabas();
  }, []);

  useEffect(() => {
    if (!isLoadingWabas && imWabas.length > 0) {
      loadLines();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [imWabas, isLoadingWabas]);

  const loadImWabas = async () => {
    try {
      const res = await fetch('/api/im-wabas');
      if (!res.ok) throw new Error('Falha ao carregar WABAs do IM');
      const data: ImWabaDto[] = await res.json();
      setImWabas(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsLoadingWabas(false);
    }
  };

  const loadAvailableWabas = async () => {
    try {
      const res = await fetch('/api/meta/wabas');
      if (!res.ok) throw new Error('Falha ao carregar WABAs disponíveis');
      const data: Waba[] = await res.json();
      setAvailableWabas(data);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const loadLines = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setRows([]);
    setProgress({ processed: 0, total: 0 });
    setCacheKey(null);
    setIsStreaming(true);

    const eventSource = new EventSource('/api/meta/lines/stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const streamEvent: MetaLinesStreamEvent = JSON.parse(event.data);

        if (streamEvent.type === 'row') {
          setRows((prev) => [...prev, streamEvent.data]);
        } else if (streamEvent.type === 'progress') {
          setProgress(streamEvent.data);
        } else if (streamEvent.type === 'complete') {
          setCacheKey(streamEvent.data.cacheKey);
          setProgress({
            processed: streamEvent.data.total,
            total: streamEvent.data.total,
          });
          setIsStreaming(false);
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    eventSource.onerror = (e) => {
      console.error('SSE error:', e);
      toast.error('Erro ao carregar dados.');
      setIsStreaming(false);
      eventSource.close();
      eventSourceRef.current = null;
    };
  };

  const handleToggleWaba = async (waba: Waba, isChecked: boolean) => {
    try {
      if (isChecked) {
        const res = await fetch('/api/im-wabas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wabaId: waba.id,
            wabaName: waba.name || waba.id,
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || 'Falha ao adicionar WABA');
        }
      } else {
        const res = await fetch(`/api/im-wabas/${waba.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error('Falha ao remover WABA');
        }
      }

      await loadImWabas();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const isWabaSelected = (wabaId: string) => {
    return imWabas.some((w) => w.wabaId === wabaId);
  };

  const filteredAvailableWabas = availableWabas.filter((waba) => {
    const searchLower = wabaSearchTerm.toLowerCase();
    return (
      waba.id.toLowerCase().includes(searchLower) ||
      (waba.name && waba.name.toLowerCase().includes(searchLower))
    );
  });

  const handleExportCsv = async () => {
    if (!cacheKey) {
      toast.error('Nenhum dado carregado para exportar.');
      return;
    }

    try {
      const res = await fetch(`/api/meta/export/lines?cacheKey=${cacheKey}`);

      if (res.status === 410) {
        toast.error('Cache expirado. Por favor, recarregue os dados.');
        return;
      }

      if (!res.ok) {
        throw new Error('Falha ao exportar CSV');
      }

      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linhas-meta.csv';
      a.click();
      globalThis.URL.revokeObjectURL(url);
      toast.success('CSV exportado com sucesso!');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'CONNECTED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FLAGGED':
        return 'error';
      case 'MIGRATED':
        return 'info';
      case 'DISCONNECTED':
        return 'default';
      case 'UNKNOWN':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Exportar Linhas da Meta
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Visualize e exporte todas as linhas do WhatsApp Business
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Linhas
          </Typography>
          <IconButton
            onClick={() => setFilterDialogOpen(true)}
            color="primary"
            title="Filtrar WABAs"
          >
            <FilterListIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {isStreaming
            ? `Carregando... ${progress.processed} linha(s) encontrada(s)`
            : `${rows.length} linha(s) encontrada(s)`}
        </Typography>

        {isStreaming && <LinearProgress sx={{ mb: 2 }} />}

        <TableContainer component={Paper} sx={{ maxHeight: 600, mb: 2 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'id'}
                    direction={sortBy === 'id' ? sortOrder : 'asc'}
                    onClick={() => handleSort('id')}
                  >
                    ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'line'}
                    direction={sortBy === 'line' ? sortOrder : 'asc'}
                    onClick={() => handleSort('line')}
                  >
                    Linha
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'wabaId'}
                    direction={sortBy === 'wabaId' ? sortOrder : 'asc'}
                    onClick={() => handleSort('wabaId')}
                  >
                    ID do WABA
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'wabaName'}
                    direction={sortBy === 'wabaName' ? sortOrder : 'asc'}
                    onClick={() => handleSort('wabaName')}
                  >
                    WABA
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? sortOrder : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Nome
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'active'}
                    direction={sortBy === 'active' ? sortOrder : 'asc'}
                    onClick={() => handleSort('active')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'verified'}
                    direction={sortBy === 'verified' ? sortOrder : 'asc'}
                    onClick={() => handleSort('verified')}
                  >
                    Verificada
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'qualityRating'}
                    direction={sortBy === 'qualityRating' ? sortOrder : 'asc'}
                    onClick={() => handleSort('qualityRating')}
                  >
                    Qualidade
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.length === 0 && !isStreaming ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Nenhuma linha encontrada
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.line}</TableCell>
                    <TableCell>{row.wabaId}</TableCell>
                    <TableCell>{row.wabaName}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.active}
                        color={getStatusColor(row.active)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.verified}
                        color={row.verified === 'Sim' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        let color: 'default' | 'success' | 'warning' | 'error' =
                          'default';
                        if (row.qualityRating === 'HIGH') color = 'success';
                        else if (row.qualityRating === 'MEDIUM')
                          color = 'warning';
                        else if (row.qualityRating === 'LOW') color = 'error';
                        return (
                          <Chip
                            label={row.qualityRating}
                            color={color}
                            size="small"
                          />
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          variant="contained"
          onClick={handleExportCsv}
          disabled={!cacheKey || isStreaming}
        >
          Exportar CSV
        </Button>
      </Box>

      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filtrar WABAs</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Pesquisar WABA"
            variant="outlined"
            value={wabaSearchTerm}
            onChange={(e) => setWabaSearchTerm(e.target.value)}
            placeholder="Digite o nome ou ID do WABA"
            sx={{ mb: 2, mt: 1 }}
          />
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {isLoadingWabas ? (
              <LinearProgress />
            ) : filteredAvailableWabas.length === 0 ? (
              <Typography color="text.secondary" align="center">
                Nenhum WABA encontrado
              </Typography>
            ) : (
              filteredAvailableWabas.map((waba) => (
                <FormControlLabel
                  key={waba.id}
                  control={
                    <Checkbox
                      checked={isWabaSelected(waba.id)}
                      onChange={(e) => handleToggleWaba(waba, e.target.checked)}
                    />
                  }
                  label={`${waba.name || waba.id} (${waba.id})`}
                  sx={{ display: 'block', mb: 1 }}
                />
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
