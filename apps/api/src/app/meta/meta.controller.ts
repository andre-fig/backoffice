import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetaService } from './meta.service';

@Controller('meta')
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get('wabas')
  async getWabas() {
    return this.meta.listWabas();
  }

  @Get('wabas/:wabaId/lines')
  async getLines(@Param('wabaId') wabaId: string) {
    return this.meta.listLines(wabaId);
  }

  @Get('export/lines')
  async exportLines(@Res() res: Response) {
    const wabas = await this.meta.listWabas();

    const rows: Array<{
      id: string;
      linha: string;
      idWaba: string;
      waba: string;
      nome: string;
      ativa: string;
      verificada: string;
    }> = [];

    for (const waba of wabas) {
      const lines = await this.meta.listLines(waba.id);
      for (const line of lines) {
        const ativa = (line.status ?? '').toUpperCase();
        // Busca informações detalhadas para selo azul
        const details = await this.meta.getPhoneNumberDetails(line.id);
        const verificada = details.is_official_business_account ? 'Sim' : 'Não';
        rows.push({
          id: line.id,
          linha:
            details.display_phone_number ?? line.display_phone_number ?? '',
          idWaba: waba.id,
          waba: waba.name ?? '',
          nome: details.verified_name ?? line.verified_name ?? '',
          ativa,
          verificada,
        });
      }
    }

    // Gera CSV
    const headers = [
      'ID',
      'Linha',
      'idWaba',
      'Waba',
      'Nome',
      'Ativa',
      'Verificada (selo azul)',
    ];
    const escapeCsv = (value: unknown) => {
      let s: string;
      if (value === null || value === undefined) s = '';
      else if (typeof value === 'string') s = value;
      else if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
      )
        s = String(value);
      else if (typeof value === 'object') {
        try {
          s = JSON.stringify(value);
        } catch {
          s = '';
        }
      } else s = '';
      if (/[",\n;]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const csvLines: string[] = [];
    csvLines.push(headers.join(','));
    for (const r of rows) {
      csvLines.push(
        [
          escapeCsv(r.id),
          escapeCsv(r.linha),
          escapeCsv(r.idWaba),
          escapeCsv(r.waba),
          escapeCsv(r.nome),
          escapeCsv(r.ativa),
          escapeCsv(r.verificada),
        ].join(',')
      );
    }

    const csvContent = '\uFEFF' + csvLines.join('\n'); // BOM para melhor compatibilidade com Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="linhas-meta.csv"'
    );
    res.send(csvContent);
  }
}
