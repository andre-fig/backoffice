import { useState } from 'react';
import { Button, Stack, Typography, Alert } from '@mui/material';

export default function MetaLinesExportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/export/lines');
      if (!res.ok) throw new Error('Falha ao gerar PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linhas-meta.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Exportar Linhas (Meta / WhatsApp)</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" onClick={handleExport} disabled={loading}>
        {loading ? 'Gerando…' : 'Exportar PDF'}
      </Button>
    </Stack>
  );
}
