import { OpenApiSpec } from '@loopback/openapi-v3-types';
import {
    Configuration,
    IPreprocessedData,
} from 'cloud-docs-shared-code';
import {
    getBlobName,
    storeReferenceDataToBlobStorage,
} from '../external/blobManager';
import { getHtml } from './redoc-cli';
import { prerenderOptions } from './redoc-cli/prerenderOptions';
import { resolveComponents } from './resolveComponents';

export const renderReference = async (specification: OpenApiSpec, blob: IPreprocessedData): Promise<void> => {
    const template = './redoc/redoc-cli/template2.hbs';

    const traversedSpecification = traverseObject(specification, resolveComponents);

    const html = await getHtml(template, traversedSpecification, prerenderOptions);
    const blobName = getBlobName(blob.zapiSpecificationCodename, 'html', blob.operation);
    await storeReferenceDataToBlobStorage(html, blobName, Configuration.keys.azureContainerName);
};

const traverseObject = (
    obj: object,
    callback: (obj: object, key: string) => object,
): object => {
    if (obj) {
        Object.keys(obj).forEach((key) => {
            obj = callback(obj, key);

            if (typeof obj[key] === 'object') {
                traverseObject(obj[key], callback);
            }
        });
    }

    return obj;
};
