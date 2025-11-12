import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  ChipProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useToast } from '../hooks/useToast';

type TemplateRow = {
  id: string;
  externalId: string;
  name: string;
  language: string;
  status?: string | null;
  category?: string | null;
  updatedAt: string;
  waba?: {
    externalId: string;
    wabaName: string;
  };
};

type TemplateAnalyticsRow = {
  id: string;
  templateId: string;
  date: string;
  granularity: string;
  sent: number;
  delivered: number;
  read: number;
  costAmount: number;
  costPerDelivered: number;
};

const buildDefaultDates = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

const statusColorMap: Record<string, ChipProps['color']> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
  PAUSED: 'warning',
};

export default function MetaTemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRow | null>(
    null
  );
  const [analyticsRows, setAnalyticsRows] = useState<TemplateAnalyticsRow[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [{ start: defaultStart, end: defaultEnd }] = useState(
    buildDefaultDates()
  );
  const [analyticsStartDate, setAnalyticsStartDate] = useState(defaultStart);
  const [analyticsEndDate, setAnalyticsEndDate] = useState(defaultEnd);

  const isDialogOpen = useMemo(() => !!selectedTemplate, [selectedTemplate]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchAnalytics(
        selectedTemplate.id,
        analyticsStartDate,
        analyticsEndDate
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('Falha ao carregar templates cadastrados');
      }
      const data: TemplateRow[] = await response.json();
      setTemplates(data ?? []);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async (
    templateId: string,
    start?: string,
    end?: string
  ) => {
    try {
      setAnalyticsLoading(true);
      const params = new URLSearchParams();
      if (start && end) {
        params.set('start', start);
        params.set('end', end);
      }
      const query = params.toString();
      const response = await fetch(
        `/api/templates/${templateId}/analytics${query ? `?${query}` : ''}`
      );
      if (!response.ok) {
        throw new Error('Falha ao carregar analytics do template');
      }
      const data: TemplateAnalyticsRow[] = await response.json();
      const normalized = data.map((row) => ({
        ...row,
        costAmount: Number(row.costAmount ?? 0),
        costPerDelivered: Number(row.costPerDelivered ?? 0),
      }));
      setAnalyticsRows(normalized);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleTemplateClick = (template: TemplateRow) => {
    const { start, end } = buildDefaultDates();
    setAnalyticsStartDate(start);
    setAnalyticsEndDate(end);
    setSelectedTemplate(template);
  };

  const handleDialogClose = () => {
    setSelectedTemplate(null);
    setAnalyticsRows([]);
  };

  const handleAnalyticsFilter = () => {
    if (selectedTemplate) {
      fetchAnalytics(selectedTemplate.id, analyticsStartDate, analyticsEndDate);
    }
  };

  const renderStatusChip = (status?: string | null) => {
    if (!status) {
      return <Chip label="Sem status" size="small" variant="outlined" />;
    }
    const normalized = status.toUpperCase();
    const color = statusColorMap[normalized] ?? 'default';
    return (
      <Chip
        label={normalized}
        size="small"
        color={color}
        variant={color === 'default' ? 'outlined' : 'filled'}
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Templates Meta
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sincronizados automaticamente a cada hora para todos os WABAs
          visíveis. Clique em um template para visualizar os analytics
          diários.
        </Typography>
      </Box>

      <Paper elevation={1}>
        {isLoading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>WABA</TableCell>
                <TableCell>Idioma</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Atualizado em</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhum template sincronizado ainda.
                  </TableCell>
                </TableRow>
              )}
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleTemplateClick(template)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2">
                        {template.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase' }}
                      >
                        {template.externalId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {template.waba?.wabaName ?? '—'}
                    <Typography variant="caption" color="text.secondary">
                      {template.waba?.externalId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'uppercase' }}>
                    {template.language || '—'}
                  </TableCell>
                  <TableCell>{renderStatusChip(template.status)}</TableCell>
                  <TableCell sx={{ textTransform: 'uppercase' }}>
                    {template.category ?? '—'}
                  </TableCell>
                  <TableCell>
                    {new Date(template.updatedAt).toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        fullWidth
        maxWidth="lg"
        open={isDialogOpen}
        onClose={handleDialogClose}
      >
        <DialogTitle>
          Analytics do template{' '}
          <strong>{selectedTemplate?.name ?? '—'}</strong>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTemplate && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Início"
                type="date"
                size="small"
                value={analyticsStartDate}
                onChange={(event) => setAnalyticsStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Fim"
                type="date"
                size="small"
                value={analyticsEndDate}
                onChange={(event) => setAnalyticsEndDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                onClick={handleAnalyticsFilter}
                variant="contained"
                disabled={analyticsLoading}
              >
                Atualizar
              </Button>
            </Box>
          )}

          {analyticsLoading && <LinearProgress />}

          {!analyticsLoading && analyticsRows.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              Nenhum dado disponível para o período selecionado.
            </Typography>
          )}

          {analyticsRows.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Enviadas</TableCell>
                    <TableCell align="right">Entregues</TableCell>
                    <TableCell align="right">Lidas</TableCell>
                    <TableCell align="right">Custo (USD)</TableCell>
                    <TableCell align="right">Custo / delivered</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {new Date(row.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell align="right">{row.sent}</TableCell>
                      <TableCell align="right">{row.delivered}</TableCell>
                      <TableCell align="right">{row.read}</TableCell>
                      <TableCell align="right">
                        {row.costAmount.toFixed(4)}
                      </TableCell>
                      <TableCell align="right">
                        {row.costPerDelivered.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
