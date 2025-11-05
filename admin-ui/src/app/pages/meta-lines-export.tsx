import { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import { MetaLineRowDto, MetaLinesStreamEvent } from '@backoffice-monorepo/shared-types';
import { useToast } from '../hooks/useToast';

type SortOrder = 'asc' | 'desc';
type SortableColumn = 'id' | 'line' | 'wabaName' | 'name' | 'active' | 'verified' | 'qualityRating';

export default function MetaLinesExportPage() {
  const toast = useToast();
  const [rows, setRows] = useState<MetaLineRowDto[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [sortBy, setSortBy] = useState<SortableColumn>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
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
          setProgress({ processed: streamEvent.data.total, total: streamEvent.data.total });
          setIsStreaming(false);
          setLoading(false);
          eventSource.close();
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    eventSource.onerror = (e) => {
      console.error('SSE error:', e);
      toast.error('Erro ao carregar dados. Por favor, tente novamente.');
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedRows = useMemo(() => {
    const qualityOrder = { GREEN: 3, YELLOW: 2, RED: 1, UNKNOWN: 0 };
    const statusOrder = { CONNECTED: 1, DISCONNECTED: 0 };

    return [...rows].sort((a, b) => {
      let aValue: string | number = a[sortBy];
      let bValue: string | number = b[sortBy];

      if (sortBy === 'qualityRating') {
        aValue = qualityOrder[a.qualityRating as keyof typeof qualityOrder] ?? 0;
        bValue = qualityOrder[b.qualityRating as keyof typeof qualityOrder] ?? 0;
      } else if (sortBy === 'active') {
        aValue = statusOrder[a.active as keyof typeof statusOrder] ?? 0;
        bValue = statusOrder[b.active as keyof typeof statusOrder] ?? 0;
      } else if (sortBy === 'verified') {
        aValue = a.verified === 'Sim' ? 1 : 0;
        bValue = b.verified === 'Sim' ? 1 : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'pt-BR', { numeric: true });
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortBy, sortOrder]);

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
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linhas-meta.csv';
      a.click();
      window.URL.revokeObjectURL(url);
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

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Linhas
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {isStreaming 
            ? `Carregando... ${progress.processed} de ${progress.total || '?'} linha(s)`
            : `${rows.length} linha(s) encontrada(s)`
          }
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
                        color={row.active === 'CONNECTED' ? 'success' : 'default'}
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
                      <Chip
                        label={row.qualityRating}
                        color={
                          row.qualityRating === 'GREEN'
                            ? 'success'
                            : row.qualityRating === 'YELLOW'
                            ? 'warning'
                            : row.qualityRating === 'RED'
                            ? 'error'
                            : 'default'
                        }
                        size="small"
                      />
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
