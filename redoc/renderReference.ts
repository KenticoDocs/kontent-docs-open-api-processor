const fs = require('fs');

import { OpenApiSpec } from '@loopback/openapi-v3-types';
import { IPreprocessedData } from 'cloud-docs-shared-code';
import { storeReferenceDataToBlobStorage } from '../external/blobManager';
import { jsonFilePath } from '../kcd-open-api-processor/filePaths';
import { getHtml } from './redoc-cli';
import { prerenderOptions } from './redoc-cli/prerenderOptions';
import { resolveComponents } from './resolveComponents';

export const renderReference = async (json: OpenApiSpec, blob: IPreprocessedData): Promise<void> => {
    const finalJson = JSON.stringify(traverseObject(json, resolveComponents));
    await fs.promises.writeFile(jsonFilePath, finalJson);

    await renderRedoc(jsonFilePath, blob);
};

const renderRedoc = async (jsonPath: string, blob: IPreprocessedData): Promise<void> => {
    const template = './redoc/redoc-cli/template2.hbs';

    const html = await getHtml(template, jsonPath, prerenderOptions);
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
