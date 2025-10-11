import csv from 'csv-parser';
import { Readable } from 'stream';

export const parseCSV = (csvString: string): any[] => {
  const results: any[] = [];
  const stream = Readable.from([csvString]);

  stream
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      console.log('CSV parsing complete.');
    });

  return results;
};