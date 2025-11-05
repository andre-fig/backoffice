import { useState, useEffect } from 'react';
import {
  Button,
  Stack,
  Typography,
  Alert,
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
} from '@mui/material';
import { MetaLineRowDto, MetaLinesStreamEvent } from '@backoffice-monorepo/shared-types';

export default function MetaLinesExportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MetaLineRowDto[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);

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
      setError('Erro ao carregar dados. Por favor, tente novamente.');
      setLoading(false);
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleExportCsv = async () => {
    if (!cacheKey) {
      setError('Nenhum dado carregado para exportar.');
      return;
    }

    try {
      const res = await fetch(`/api/meta/export/lines?cacheKey=${cacheKey}`);
      
      if (res.status === 410) {
        setError('Cache expirado. Por favor, recarregue os dados.');
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
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Exportar Linhas da Meta
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visualize e exporte todas as linhas do WhatsApp Business
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Box>
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
                <TableCell>ID</TableCell>
                <TableCell>Linha</TableCell>
                <TableCell>WABA</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Verificada</TableCell>
                <TableCell>Qualidade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !isStreaming ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma linha encontrada
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
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
    </Stack>
  );
}
