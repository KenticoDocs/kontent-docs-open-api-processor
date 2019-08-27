const fs = require('fs');

export const getReferenceHtml = (path: string): string =>
    fs.readFileSync(path, 'utf-8');

export const writeIntoFile = (path: string, data: string): void =>
    fs.writeFileSync(path, data, { encoding: 'binary' });
