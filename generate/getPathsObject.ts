import {
    OperationObject,
    PathsObject,
    ReferenceObject,
} from '@loopback/openapi-v3-types';
import {
    ICategory,
    ICodeSample,
    ICodeSamples,
    IPathOperation,
} from 'cloud-docs-shared-code';
import { getBooleanProperty } from '../utils/getProperties';
import { getItemData } from '../utils/helpers';
import { processRichTextWithComponents } from '../utils/richTextProcessing';
import {
    getParameterReference,
    resolveRequestBodyObject,
    resolveResponseObjects,
} from './generateApiSpecification';

interface IPathOperationInfo {
    readonly categoryName: string;
    readonly codename: string;
}

export const resolvePathsObject = (categoriesCodenames: string[], items: unknown): PathsObject => {
    const pathsObject = {};
    const pathOperationsData = getPathOperationsInfo(categoriesCodenames, items);

    pathOperationsData.forEach((operationData) => {
        const pathOperationData = getItemData<IPathOperation>(operationData.codename, items);
        const pathMethod = resolvePathOperation(pathOperationData, pathsObject, items, operationData);

        const requestBody = resolveRequestBodyObject(pathOperationData.requestBody, items);
        if (requestBody) {
            pathMethod.requestBody = requestBody;
        }
        const responses = resolveResponseObjects(pathOperationData.responses, items);
        if (responses) {
            pathMethod.responses = responses;
        }

        resolvePathOperationCodeSamples(pathOperationData, items, pathMethod);
    });

    return pathsObject;
};

const getPathOperationsInfo = (categoriesCodenames: string[], items: unknown): Set<IPathOperationInfo> => {
    const pathOperationsInfo = new Set<IPathOperationInfo>();

    categoriesCodenames.forEach((codename) => {
        const categoryData = getItemData<ICategory>(codename, items);

        categoryData.pathOperations.forEach((pathOperationCodename) => {
            pathOperationsInfo.add({
                categoryName: categoryData.name,
                codename: pathOperationCodename,
            });
        });
    });

    return pathOperationsInfo;
};

const resolvePathOperation = (
    pathOperationData: IPathOperation,
    pathsObject: PathsObject,
    items: unknown,
    pathOperationInfo: IPathOperationInfo,
): OperationObject => {
    const pathOperation = pathOperationData.pathOperation[0].toLowerCase();
    const path = pathOperationData.path;

    if (!pathsObject[path]) {
        pathsObject[path] = {};
    }

    pathsObject[path][pathOperation] = {
        description: processRichTextWithComponents(pathOperationData.description, items),
        operationId: pathOperationData.url,
        parameters: resolveParameterObjects(pathOperationData.parameters, items),
        summary: pathOperationData.name,
        tags: [pathOperationInfo.categoryName],
        ...getBooleanProperty(pathOperationData.deprecated, 'deprecated'),
    };

    return pathsObject[path][pathOperation];
};

const resolveParameterObjects = (codenames: string[], items: unknown): ReferenceObject[] =>
    codenames.map((codename) => getParameterReference(codename, items));

const resolvePathOperationCodeSamples = (pathOperationData, items: unknown, pathMethod): void => {
    if (pathOperationData.codeSamples.length === 1) {
        const codeSamplesCodename = pathOperationData.codeSamples[0];
        const codeSamplesObject = getItemData<ICodeSamples>(codeSamplesCodename, items);
        const codeSampleCodenames = codeSamplesObject.codeSamples;

        pathMethod['x-code-samples'] = codeSampleCodenames.map((codename) => {
            const codeSampleObject = getItemData<ICodeSample>(codename, items);

            return {
                lang: (codeSampleObject.programmingLanguage.length === 1)
                    ? codeSampleObject.programmingLanguage[0]
                    : 'not_specified',
                source: codeSampleObject.code,
            };
        });
    }
};
