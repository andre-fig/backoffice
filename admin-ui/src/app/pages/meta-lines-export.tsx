import { useState, useEffect } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const [selectedWabaId, setSelectedWabaId] = useState<string>('');
  const [isLoadingWabas, setIsLoadingWabas] = useState(true);
  const [isAddingWaba, setIsAddingWaba] = useState(false);

  const { sortBy, sortOrder, handleSort, sortedData: sortedRows } = useSortable(
    rows,
    {
      initialColumn: 'id' as SortableColumn,
      columns: {
        id: {
          accessor: (r) => r.id,
        },
        line: {
          accessor: (r) => r.line,
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
            CONNECTED: 1,
            DISCONNECTED: 0,
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
            GREEN: 3,
            YELLOW: 2,
            RED: 1,
            UNKNOWN: 0,
          },
        },
      },
    }
  );

  useEffect(() => {
    loadImWabas();
    loadAvailableWabas();
  }, []);

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
    setRows([]);
    setProgress({ processed: 0, total: 0 });
    setCacheKey(null);
    setIsStreaming(true);

    const eventSource = new EventSource('/api/meta/lines/stream');

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
    };

    return () => {
      eventSource.close();
    };
  };

  const handleAddWaba = async () => {
    if (!selectedWabaId) {
      toast.error('Selecione um WABA para adicionar');
      return;
    }

    const selectedWaba = availableWabas.find((w) => w.id === selectedWabaId);
    if (!selectedWaba) {
      toast.error('WABA não encontrado');
      return;
    }

    setIsAddingWaba(true);
    try {
      const res = await fetch('/api/im-wabas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wabaId: selectedWaba.id,
          wabaName: selectedWaba.name || selectedWaba.id,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Falha ao adicionar WABA');
      }

      toast.success('WABA adicionado com sucesso!');
      setSelectedWabaId('');
      await loadImWabas();
      loadLines();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsAddingWaba(false);
    }
  };

  const handleRemoveWaba = async (wabaId: string) => {
    if (!confirm('Tem certeza que deseja remover este WABA?')) {
      return;
    }

    try {
      const res = await fetch(`/api/im-wabas/${wabaId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Falha ao remover WABA');
      }

      toast.success('WABA removido com sucesso!');
      await loadImWabas();
      loadLines();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Exportar Linhas da Meta
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Visualize e exporte todas as linhas do WhatsApp Business
      </Typography>

      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          WABAs do Instant Messenger
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Gerencie os WABAs que serão exibidos na listagem de linhas
        </Typography>

        {isLoadingWabas ? (
          <LinearProgress sx={{ mt: 2 }} />
        ) : (
          <>
            {imWabas.length === 0 && (
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                Nenhum WABA cadastrado. Adicione um WABA para visualizar as linhas.
              </Alert>
            )}

            {imWabas.length > 0 && (
              <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID do WABA</TableCell>
                      <TableCell>Nome</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {imWabas.map((waba) => (
                      <TableRow key={waba.wabaId}>
                        <TableCell>{waba.wabaId}</TableCell>
                        <TableCell>{waba.wabaName}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveWaba(waba.wabaId)}
                            title="Remover WABA"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Selecione um WABA</InputLabel>
                <Select
                  value={selectedWabaId}
                  onChange={(e) => setSelectedWabaId(e.target.value)}
                  label="Selecione um WABA"
                  disabled={isAddingWaba}
                >
                  {availableWabas
                    .filter((w) => !imWabas.some((im) => im.wabaId === w.id))
                    .map((waba) => (
                      <MenuItem key={waba.id} value={waba.id}>
                        {waba.name || waba.id} ({waba.id})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddWaba}
                disabled={!selectedWabaId || isAddingWaba}
              >
                {isAddingWaba ? 'Adicionando...' : 'Adicionar WABA'}
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Linhas
          </Typography>
          <Button
            variant="outlined"
            onClick={loadLines}
            disabled={isStreaming || imWabas.length === 0}
          >
            Carregar Linhas
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {isStreaming
            ? `Carregando... ${progress.processed} de ${
                progress.total || '?'
              } linha(s)`
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
                  <TableCell colSpan={7} align="center">
                    Nenhuma linha encontrada
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.line}</TableCell>
                    <TableCell>{row.wabaName}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.active}
                        color={
                          row.active === 'CONNECTED' ? 'success' : 'default'
                        }
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
                        if (row.qualityRating === 'GREEN') color = 'success';
                        else if (row.qualityRating === 'YELLOW')
                          color = 'warning';
                        else if (row.qualityRating === 'RED') color = 'error';
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
    </Box>
  );
}
