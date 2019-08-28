const fs = require('fs');
const cmd = require('node-cmd');

import { IPreprocessedData } from 'cloud-docs-shared-code';
import { storeReferenceDataToBlobStorage } from '../external/blobManager';
import {
    htmlFilePath,
    jsonFilePath,
} from '../kcd-open-api-processor/filePaths';
import { getReferenceHtml } from './fileHelpers';
import { prerenderOptions } from './redoc-cli/prerender-options';
import { resolveComponents } from './resolveComponents';

export const renderReference = (json: string, blob: IPreprocessedData): void => {
    const jsonAsYaml = JSON.parse(json);
    const finalJson = JSON.stringify(traverseObject(jsonAsYaml, resolveComponents));

    const stream = fs.createWriteStream(jsonFilePath);
    stream.once('open', () => {
        stream.write(finalJson);
        stream.end();
        renderRedoc(jsonFilePath, htmlFilePath, blob);
    });
};

const renderRedoc = (jsonPath: string, htmlPath: string, blob: IPreprocessedData): void => {
    const options = prerenderOptions.join(' ');
    const template = './redoc-cli/template2.hbs';

    cmd.get(
        `node ./redoc-cli/index.js bundle './redoc-cli/openapi.json' -t ${template} ${options}`,
        async () => {
            const html = getReferenceHtml(htmlPath);
            await storeReferenceDataToBlobStorage(html, blob.zapiSpecificationCodename, blob.operation);
        },
    );
};

const traverseObject = (
    obj: object,
    callback: (obj: object, key: string) => object,
): object => {
    Object.keys(obj).forEach((key) => {
        obj = callback(obj, key);

        if (typeof obj[key] === 'object') {
            traverseObject(obj[key], callback);
        }
    });

    return obj;
};
