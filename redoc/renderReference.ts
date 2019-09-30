import { OpenApiSpec } from '@loopback/openapi-v3-types';
import { IPreprocessedData } from 'cloud-docs-shared-code';
import { storeReferenceDataToBlobStorage } from '../external/blobManager';
import { getHtml } from './redoc-cli';
import { prerenderOptions } from './redoc-cli/prerenderOptions';
import { resolveComponents } from './resolveComponents';

export const renderReference = async (specification: OpenApiSpec, blob: IPreprocessedData): Promise<void> => {
    const template = './redoc/redoc-cli/template2.hbs';

    const traversedSpecification = traverseObject(specification, resolveComponents);

    const html = await getHtml(template, traversedSpecification, prerenderOptions);
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
