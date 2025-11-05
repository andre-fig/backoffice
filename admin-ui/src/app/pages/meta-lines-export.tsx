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
import { MetaLineRowDto, MetaLinesStreamEvent, WabaAnalyticsResponseDto } from '@backoffice-monorepo/shared-types';

// Backoffice WABA as returned by /api/meta/wabas
type BackofficeWaba = {
  id: string; // UUID (internal)
  externalId: string; // Meta WABA ID
  wabaName: string;
  isVisible: boolean;
};

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
  const [availableWabas, setAvailableWabas] = useState<BackofficeWaba[]>([]);
  const [isLoadingWabas, setIsLoadingWabas] = useState(true);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [wabaSearchTerm, setWabaSearchTerm] = useState('');
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<MetaLineRowDto | null>(null);
  const [analyticsData, setAnalyticsData] =
    useState<WabaAnalyticsResponseDto | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [analyticsStartDate, setAnalyticsStartDate] = useState(today);
  const [analyticsEndDate, setAnalyticsEndDate] = useState(today);
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
    loadAvailableWabas();
  }, []);

  useEffect(() => {
    // Inicia o streaming quando houver pelo menos um WABA visível
    if (!isLoadingWabas && availableWabas.some((w) => w.isVisible)) {
      loadLines();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [availableWabas, isLoadingWabas]);

  const loadAvailableWabas = async () => {
    try {
      const res = await fetch('/api/meta/wabas');
      if (!res.ok) throw new Error('Falha ao carregar WABAs disponíveis');
      const data: BackofficeWaba[] = await res.json();
      setAvailableWabas(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsLoadingWabas(false);
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

  const handleToggleWaba = async (waba: BackofficeWaba, isChecked: boolean) => {
    try {
      const res = await fetch(`/api/im-wabas/${waba.externalId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: isChecked }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Falha ao atualizar visibilidade do WABA');
      }
      // Atualiza lista e reinicia streaming
      await loadAvailableWabas();
      loadLines();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const isWabaSelected = (waba: BackofficeWaba) => waba.isVisible === true;

  const filteredAvailableWabas = availableWabas.filter((waba) => {
    const searchLower = (wabaSearchTerm || '').toLowerCase();
    return (
      (waba.externalId?.toLowerCase() || '').includes(searchLower) ||
      (waba.wabaName?.toLowerCase() || '').includes(searchLower)
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

  const getStatusColor = (
    status: string
  ): 'default' | 'success' | 'warning' | 'error' | 'info' => {
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

  const handleLineClick = (row: MetaLineRowDto) => {
    setSelectedLine(row);
    setAnalyticsDialogOpen(true);
    setAnalyticsData(null);
  };

  const loadLineAnalytics = async () => {
    if (!selectedLine) return;

    setIsLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (analyticsStartDate) params.append('startDate', analyticsStartDate);
      if (analyticsEndDate) params.append('endDate', analyticsEndDate);

      const res = await fetch(
        `/api/analytics/line/${selectedLine.id}?${params.toString()}`
      );
      if (!res.ok) throw new Error('Falha ao carregar analytics');
      const data: WabaAnalyticsResponseDto = await res.json();
      setAnalyticsData(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (analyticsDialogOpen && selectedLine) {
      loadLineAnalytics();
    }
  }, [analyticsDialogOpen, selectedLine, analyticsStartDate, analyticsEndDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryColor = (
    category: string
  ): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
    switch (category) {
      case 'MARKETING':
        return 'primary';
      case 'UTILITY':
        return 'info';
      case 'SERVICE':
        return 'success';
      case 'AUTHENTICATION':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getDirectionColor = (
    direction: string
  ): 'default' | 'primary' | 'secondary' => {
    return direction === 'BUSINESS_INITIATED' ? 'primary' : 'secondary';
  };

  const renderAnalyticsTable = () => {
    if (isLoadingAnalytics) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <LinearProgress sx={{ width: '100%' }} />
        </Box>
      );
    }

    if (!analyticsData || Object.keys(analyticsData).length === 0) {
      return (
        <Typography color="text.secondary" align="center" sx={{ p: 2 }}>
          Nenhum dado de analytics encontrado para o período selecionado.
        </Typography>
      );
    }

    const analyticsRows: Array<{
      date: string;
      category: string;
      direction: string;
      conversations: number;
      cost: number;
    }> = [];

    Object.entries(analyticsData).forEach(([date, dateData]) => {
      Object.entries(dateData).forEach(([, lineData]) => {
        Object.entries(lineData).forEach(([category, categoryData]) => {
          Object.entries(categoryData).forEach(([direction, directionData]) => {
            analyticsRows.push({
              date,
              category,
              direction,
              conversations: directionData.conversations,
              cost: directionData.cost,
            });
          });
        });
      });
    });

    const totalConversations = analyticsRows.reduce(
      (sum, row) => sum + row.conversations,
      0
    );
    const totalCost = analyticsRows.reduce((sum, row) => sum + row.cost, 0);

    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Paper sx={{ flex: 1, p: 2 }}>
            <Typography color="text.secondary" variant="body2">
              Total de Conversas
            </Typography>
            <Typography variant="h5">
              {totalConversations.toLocaleString('pt-BR')}
            </Typography>
          </Paper>
          <Paper sx={{ flex: 1, p: 2 }}>
            <Typography color="text.secondary" variant="body2">
              Custo Total
            </Typography>
            <Typography variant="h5">{formatCurrency(totalCost)}</Typography>
          </Paper>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Direção</TableCell>
                <TableCell align="right">Conversas</TableCell>
                <TableCell align="right">Custo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analyticsRows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.category}
                      color={getCategoryColor(row.category)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.direction}
                      color={getDirectionColor(row.direction)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {row.conversations.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.cost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6">Linhas</Typography>
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
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => handleLineClick(row)}
                    sx={{ cursor: 'pointer' }}
                  >
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
                  key={waba.externalId}
                  control={
                    <Checkbox
                      checked={isWabaSelected(waba)}
                      onChange={(e) => handleToggleWaba(waba, e.target.checked)}
                    />
                  }
                  label={`${waba.wabaName || waba.externalId} (${waba.externalId})`}
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

      <Dialog
        open={analyticsDialogOpen}
        onClose={() => setAnalyticsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Analytics de Custos - {selectedLine?.line}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 1 }}>
            <TextField
              label="Data Inicial"
              type="date"
              value={analyticsStartDate}
              onChange={(e) => setAnalyticsStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              size="small"
            />
            <TextField
              label="Data Final"
              type="date"
              value={analyticsEndDate}
              onChange={(e) => setAnalyticsEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              size="small"
            />
          </Box>
          {renderAnalyticsTable()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
