const fs = require('fs');

import { IPreprocessedData } from 'cloud-docs-shared-code';
import { storeReferenceDataToBlobStorage } from '../external/blobManager';
import { jsonFilePath } from '../kcd-open-api-processor/filePaths';
import { getHtml } from './redoc-cli';
import { prerenderOptions } from './redoc-cli/prerender-options';
import { resolveComponents } from './resolveComponents';

export const renderReference = (json: string, blob: IPreprocessedData): void => {
    const jsonAsYaml = JSON.parse(json);
    const finalJson = JSON.stringify(traverseObject(jsonAsYaml, resolveComponents));
    const stream = fs.createWriteStream(jsonFilePath);

    stream.once('open', async () => {
        stream.write(finalJson);
        stream.end();
        await renderRedoc(jsonFilePath, blob);
    });
};

const renderRedoc = async (jsonPath: string, blob: IPreprocessedData): Promise<void> => {
    const options = prerenderOptions.join(' ');
    const template = './redoc/redoc-cli/template2.hbs';

    const html = await getHtml(template, jsonPath, options);
    await storeReferenceDataToBlobStorage(html, blob.zapiSpecificationCodename, blob.operation);
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
