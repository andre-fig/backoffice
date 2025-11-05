import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useToast } from '../hooks/useToast';
import { ImWabaDto, WabaAnalyticsResponseDto } from '@backoffice-monorepo/shared-types';

export default function AnalyticsPage() {
  const toast = useToast();
  const [wabas, setWabas] = useState<ImWabaDto[]>([]);
  const [selectedWaba, setSelectedWaba] = useState<ImWabaDto | null>(null);
  const [analyticsData, setAnalyticsData] = useState<WabaAnalyticsResponseDto | null>(null);
  const [isLoadingWabas, setIsLoadingWabas] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    loadWabas();
  }, []);

  useEffect(() => {
    if (selectedWaba) {
      loadAnalytics();
    }
  }, [selectedWaba, startDate, endDate]);

  const loadWabas = async () => {
    try {
      const res = await fetch('/api/im-wabas');
      if (!res.ok) throw new Error('Falha ao carregar WABAs');
      const data: ImWabaDto[] = await res.json();
      setWabas(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsLoadingWabas(false);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedWaba) return;

    setIsLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/analytics/waba/${selectedWaba.wabaId}?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar analytics');
      const data: WabaAnalyticsResponseDto = await res.json();
      setAnalyticsData(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleWabaClick = (waba: ImWabaDto) => {
    setSelectedWaba(waba);
    setAnalyticsData(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryColor = (category: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
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

  const getDirectionColor = (direction: string): 'default' | 'primary' | 'secondary' => {
    return direction === 'BUSINESS_INITIATED' ? 'primary' : 'secondary';
  };

  const renderAnalyticsTable = () => {
    if (!analyticsData || Object.keys(analyticsData).length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhum dado de analytics encontrado para o período selecionado.
        </Alert>
      );
    }

    const rows: Array<{
      date: string;
      phoneNumber: string;
      category: string;
      direction: string;
      conversations: number;
      cost: number;
    }> = [];

    Object.entries(analyticsData).forEach(([date, dateData]) => {
      Object.entries(dateData).forEach(([phoneNumber, lineData]) => {
        Object.entries(lineData).forEach(([category, categoryData]) => {
          Object.entries(categoryData).forEach(([direction, directionData]) => {
            rows.push({
              date,
              phoneNumber,
              category,
              direction,
              conversations: directionData.conversations,
              cost: directionData.cost,
            });
          });
        });
      });
    });

    const totalConversations = rows.reduce((sum, row) => sum + row.conversations, 0);
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

    return (
      <Box sx={{ mt: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total de Conversas
              </Typography>
              <Typography variant="h4">
                {totalConversations.toLocaleString('pt-BR')}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Custo Total
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalCost)}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Linha</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Direção</TableCell>
                <TableCell align="right">Conversas</TableCell>
                <TableCell align="right">Custo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index} hover>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.phoneNumber}</TableCell>
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
                  <TableCell align="right">{row.conversations.toLocaleString('pt-BR')}</TableCell>
                  <TableCell align="right">{formatCurrency(row.cost)}</TableCell>
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
        Analytics de Custos do WhatsApp
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Visualize os dados de custo de conversas do WhatsApp por WABA
      </Typography>

      {!selectedWaba ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Selecione um WABA
          </Typography>
          {isLoadingWabas ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : wabas.length === 0 ? (
            <Alert severity="info">
              Nenhum WABA cadastrado. Adicione WABAs na página de Exportar Linhas da Meta.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {wabas.map((waba) => (
                <Grid item xs={12} sm={6} md={4} key={waba.wabaId}>
                  <Card>
                    <CardActionArea onClick={() => handleWabaClick(waba)}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {waba.wabaName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {waba.wabaId}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      ) : (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6">
                {selectedWaba.wabaName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {selectedWaba.wabaId}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => {
                  setSelectedWaba(null);
                  setAnalyticsData(null);
                }}
              >
                Voltar para lista de WABAs
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Data Inicial"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Data Final"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          {isLoadingAnalytics ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderAnalyticsTable()
          )}
        </Box>
      )}
    </Box>
  );
}
