import { Injectable } from '@nestjs/common';
import { MetaLineRowDto } from '@backoffice-monorepo/shared-types';

@Injectable()
export class CsvExportService {
  private readonly headers = [
    'ID',
    'ID Externo',
    'Linha',
    'idWaba',
    'Waba',
    'Nome',
    'Status do Nome',
    'Ativa',
    'Verificada (selo azul)',
    'Qualidade da Linha',
  ];

  buildCsv(rows: MetaLineRowDto[]): string {
    const csvLines: string[] = [];
    csvLines.push(this.headers.join(','));

    for (const row of rows) {
      csvLines.push(
        [
          this.escapeCsv(row.id),
          this.escapeCsv(row.externalId),
          this.escapeCsv((row.line.match(/\d+/g) || []).join('')),
          this.escapeCsv(row.wabaId),
          this.escapeCsv(row.wabaName),
          this.escapeCsv(row.name),
          this.escapeCsv(row.nameStatus),
          this.escapeCsv(row.active),
          this.escapeCsv(row.verified),
          this.escapeCsv(row.qualityRating),
        ].join(',')
      );
    }

    return '\uFEFF' + csvLines.join('\n');
  }

  private escapeCsv(value: unknown): string {
    let stringValue: string;

    if (value === null || value === undefined) {
      stringValue = '';
    } else if (typeof value === 'string') {
      stringValue = value;
    } else if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      stringValue = String(value);
    } else if (typeof value === 'object') {
      try {
        stringValue = JSON.stringify(value);
      } catch {
        stringValue = '';
      }
    } else {
      stringValue = '';
    }

    if (/[",\n;]/.test(stringValue)) {
      return '"' + stringValue.split('"').join('""') + '"';
    }

    return stringValue;
  }
}
