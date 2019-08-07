import {
    ComponentsObject,
    HeadersObject,
    InfoObject,
    OpenApiSpec,
    ParameterLocation,
    PathsObject,
    ReferenceObject,
    RequestBodyObject,
    ResponseObject,
    ResponsesObject,
    SchemaObject,
    SecuritySchemeObject,
    SecuritySchemeType,
    ServerObject,
    TagObject,
} from '@loopback/openapi-v3-types';
import {
    ICategory,
    ICodeSample,
    ICodeSamples,
    IContact,
    ILicense,
    IParameter,
    IPathOperation,
    IPreprocessedData,
    IRequestBody,
    IResponse,
    ISecurityScheme,
    IServer,
    IZapiSpecification,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    getBooleanProperty,
    getHeadersProperty,
    getMultipleChoiceProperty,
    getNonEmptyStringProperty,
    getSchemaProperty,
} from '../utils/getProperties';
import {
    getChildCodenamesFromRichText,
    getChildInfosFromRichText,
    getItemData,
    getReferenceObject,
    isNonEmptyString,
} from '../utils/helpers';
import {
    processRichTextWithCallouts,
    processRichTextWithComponents,
} from '../utils/richTextProcessing';
import {
    getSchemaObject,
    ISchemas,
} from './getSchemaObjects';

const parametersComponents = {};
const requestBodiesComponents = {};
const responseComponents = {};
const schemasComponents = {};

export const generateApiSpecification = (data: IPreprocessedData): OpenApiSpec => {
    const items = data.items;
    const apiSpecification: IZapiSpecification = items[data.zapiSpecificationCodename];

    const openApiSpecification: OpenApiSpec = {
        info: resolveInfoObject(apiSpecification, items),
        openapi: '3.0.2',
        paths: resolvePathsObject(apiSpecification.categories, items),
        security: [],
        servers: resolveServerObjects(apiSpecification.servers, items),
        tags: resolveTagObjects(apiSpecification.categories, items),
    };

    openApiSpecification.components = resolveComponentsObject(apiSpecification, items);

    return openApiSpecification;
};

const resolveInfoObject = (apiSpecification: IZapiSpecification, items: unknown): InfoObject => {
    const infoObject: InfoObject = {
        description: processRichTextWithComponents(apiSpecification.description, items),
        title: apiSpecification.title,
        version: apiSpecification.version,
        ...getNonEmptyStringProperty(apiSpecification.termsOfService, 'termsOfService'),
    };
    resolveContactObject(apiSpecification, items, infoObject);
    resolveLicenseObject(apiSpecification, items, infoObject);

    return infoObject;
};

const resolveContactObject = (apiSpecification: IZapiSpecification, items: unknown, infoObject: InfoObject): void => {
    if (apiSpecification.contact.length === 1) {
        const contactCodename = apiSpecification.contact[0];
        const contactData = getItemData<IContact>(contactCodename, items);
        const { apiReference, ...contactObject } = contactData;

        infoObject.contact = contactObject;
    }
};

const resolveLicenseObject = (apiSpecification: IZapiSpecification, items: unknown, infoObject: InfoObject): void => {
    if (apiSpecification.license.length === 1) {
        const licenseCodename = apiSpecification.license[0];
        const licenseData: ILicense = getItemData<ILicense>(licenseCodename, items);
        const { apiReference, ...licenseObject } = licenseData;

        infoObject.license = licenseObject;
    }
};

const resolveServerObjects = (serversElement: string, items: unknown): ServerObject[] => {
    const serverCodenames = getChildCodenamesFromRichText(serversElement);

    return serverCodenames.map((codename) => {
        const serverData = getItemData<IServer>(codename, items);

        return {
            description: serverData.description,
            url: serverData.url,
        };
    });
};

const resolveTagObjects = (categoriesCodenames: string[], items: unknown): TagObject[] =>
    categoriesCodenames.map((codename) => {
        const categoryData = getItemData<ICategory>(codename, items);

        return {
            description: processRichTextWithComponents(categoryData.description, items),
            name: categoryData.name,
        };
    });

interface IPathOperationData {
    readonly categoryName: string;
    readonly codename: string;
}

const resolvePathsObject = (categoriesCodenames: string[], items: unknown): PathsObject => {
    const pathsObject = {};
    const pathOperationsData = new Set<IPathOperationData>();

    categoriesCodenames.forEach((codename) => {
        const categoryData = getItemData<ICategory>(codename, items);

        categoryData.pathOperations.forEach((pathOperationCodename) => {
            pathOperationsData.add({
                categoryName: categoryData.name,
                codename: pathOperationCodename,
            });
        });
    });

    pathOperationsData.forEach((operationData) => {
        const pathOperationData = getItemData<IPathOperation>(operationData.codename, items);
        const pathOperation = pathOperationData.pathOperation[0].toLowerCase();

        // Trim() is here because one path's blank space at the beginning makes YML file invalid - contact Honza?
        const trimmedPath = pathOperationData.path.trim();

        if (!pathsObject[trimmedPath]) {
            pathsObject[trimmedPath] = {};
        }

        pathsObject[trimmedPath][pathOperation] = {
            description: processRichTextWithComponents(pathOperationData.description, items),
            operationId: pathOperationData.url,
            parameters: resolveParameterObjects(pathOperationData.parameters, items),
            summary: pathOperationData.name,
            tags: [operationData.categoryName],
            ...getBooleanProperty(pathOperationData.deprecated, 'deprecated'),
        };

        const path = pathsObject[trimmedPath][pathOperation];

        const requestBody = resolveRequestBodyObject(pathOperationData.requestBody, items);
        if (requestBody) {
            path.requestBody = requestBody;
        }
        const responses = resolveResponseObjects(pathOperationData.responses, items);
        if (responses) {
            path.responses = responses;
        }

        if (pathOperationData.codeSamples.length === 1) {
            const codeSamplesCodename = pathOperationData.codeSamples[0];
            const codeSamplesObject = getItemData<ICodeSamples>(codeSamplesCodename, items);
            const codeSampleCodenames = codeSamplesObject.codeSamples;

            path['x-code-samples'] = codeSampleCodenames.map((codename) => {
                const codeSampleObject = getItemData<ICodeSample>(codename, items);

                return {
                    lang: (codeSampleObject.programmingLanguage.length === 1)
                        ? codeSampleObject.programmingLanguage[0]
                        : 'not_specified',
                    source: codeSampleObject.code,
                };
            });
        }
    });

    return pathsObject;
};

const resolveParameterObjects = (codenames: string[], items: unknown): ReferenceObject[] =>
    codenames.map((codename) => getParameterReference(codename, items));

const getParameterReference = (codename, items: unknown): ReferenceObject => {
    const parameterData = getItemData<IParameter>(codename, items);
    const name = parameterData.name;
    const schema = resolveSchemaObjectsInLinkedItems(parameterData.schema, items);

    if (!parametersComponents.hasOwnProperty(name)) {
        parametersComponents[name] = {
            description: processRichTextWithCallouts(parameterData.description, items),
            in: parameterData.location[0] as ParameterLocation,
            name,
            ...getBooleanProperty(parameterData.deprecated, 'deprecated'),
            ...getBooleanProperty(parameterData.required, 'required'),
            ...getBooleanProperty(parameterData.explode, 'explode'),
            ...getNonEmptyStringProperty(parameterData.example, 'example'),
            ...getMultipleChoiceProperty(parameterData.style, 'style'),
            ...getSchemaProperty(schema, 'schema'),
        };
    }

    return getReferenceObject('parameters', name);
};

const resolveRequestBodyObject = (richTextField: string, items: unknown): RequestBodyObject | ReferenceObject => {
    const requestBodyInfo = getChildInfosFromRichText(richTextField);
    if (requestBodyInfo.length === 1) {
        const codename = requestBodyInfo[0].codename;
        const requestBodyData = getItemData<IRequestBody>(codename, items);

        const schema = resolveSchemaObjectsInRichTextElement(requestBodyData.schema, items);

        // TODO figure out where to put example element
        const requestBodyObject: RequestBodyObject = {
            content: {},
            description: requestBodyData.description,
            ...getBooleanProperty(requestBodyData.required, 'required'),
        };
        requestBodyObject.content[requestBodyData.mediaType[0]] = {
            ...getSchemaProperty(schema, 'schema'),
        };

        if (requestBodyInfo[0].isItem) {
            const name = 'requestBody_' + codename;
            requestBodiesComponents[name] = requestBodyObject;

            return getReferenceObject('requestBodies', name);
        } else {
            return requestBodyObject;
        }
    }
};

const resolveResponseObjects = (richTextField: string, items: unknown): ResponsesObject => {
    const responsesObject: ResponsesObject = {};

    const responsesInfo = getChildInfosFromRichText(richTextField);
    responsesInfo.forEach((responseInfo) => {
        const codename = responseInfo.codename;
        const responseData = getItemData<IResponse>(codename, items);
        const headers = resolveHeadersObjects(responseData.headers, items);

        const responseObject: ResponseObject = {
            description: processRichTextWithCallouts(responseData.description, items),
            ...getHeadersProperty(headers, 'headers'),
        };

        const schema = resolveSchemaObjectsInRichTextElement(responseData.schema, items);

        if (responseData.mediaType.length === 1) {
            responseObject.content = {
                [responseData.mediaType[0]]: {
                    ...getSchemaProperty(schema, 'schema'),
                    example: responseData.example,
                },
            };
        }

        const statusCode = parseInt(responseData.httpStatus[0], 10);
        if (responseInfo.isItem) {
            const name = responseInfo.codename;
            responseComponents[name] = responseObject;

            responsesObject[statusCode] = getReferenceObject('responses', name);
        } else {
            responsesObject[statusCode] = responseObject;
        }
    });

    return responsesObject;
};

const resolveHeadersObjects = (codenames: string[], items: unknown): HeadersObject =>
    codenames
        .map((codename) => {
            const parameterData = getItemData<IParameter>(codename, items);
            const name = parameterData.name;

            return {
                [name]: getParameterReference(codename, items),
            };
        })
        .reduce((accumulated, current) => Object.assign(accumulated, current), {});

const resolveComponentsObject = (apiSpecification: IZapiSpecification, items: unknown): ComponentsObject => {
    const securitySchemes = resolveSecuritySchemeObject(apiSpecification, items);
    const securityComponents = securitySchemes
        ? { [securitySchemes.name]: securitySchemes }
        : {};

    // TODO Handle all the other component items - are there any more we need, though?

    return {
        parameters: parametersComponents,
        requestBodies: requestBodiesComponents,
        responses: responseComponents,
        schemas: schemasComponents,
        securitySchemes: securityComponents,
    };
};

const resolveSecuritySchemeObject = (apiSpecification: IZapiSpecification, items: unknown): SecuritySchemeObject => {
    if (apiSpecification.security.length === 1) {
        const securitySchemeData = getItemData<ISecurityScheme>(apiSpecification.security[0], items);

        return {
            description: processRichTextWithCallouts(securitySchemeData.description, items),
            type: securitySchemeData.type[0] as SecuritySchemeType,
            ...getMultipleChoiceProperty(securitySchemeData.apiKeyLocation, 'apiKeyLocation'),
            ...getNonEmptyStringProperty(securitySchemeData.scheme, 'scheme'),
            ...getNonEmptyStringProperty(securitySchemeData.name, 'name'),
            ...getNonEmptyStringProperty(securitySchemeData.bearerFormat, 'bearerFormat'),
        };
    }
};

// TODO Budem ukladat schemy pod ich NAME ak sa bude dat, inak pod codename ??
export const resolveSchemaObjectsInLinkedItems = (element: string[], items: unknown): SchemaObject[] => {
    const schemas = [];
    element.map((codename) => {
        const schemaData = getItemData<ISchemas>(codename, items);
        const identifier = isNonEmptyString(schemaData.name) ? schemaData.name : codename;

        schemasComponents[identifier] = getSchemaObject(schemaData, items);
        schemas.push(getReferenceObject('schemas', identifier));
    });

    return schemas;
};

export const resolveSchemaObjectsInRichTextElement = (element: string, items: unknown): SchemaObject => {
    const schemas = {};
    const schemasInfo = getChildInfosFromRichText(element);

    schemasInfo.forEach((schemaInfo) => {
        const schemaData = getItemData<ISchemas>(schemaInfo.codename, items);
        const identifier = isNonEmptyString(schemaData.name) ? schemaData.name : schemaInfo.codename;

        if (schemaInfo.isItem) {
            schemasComponents[identifier] = getSchemaObject(schemaData, items);
            schemas[identifier] = (getReferenceObject('schemas', identifier));
        } else {
            schemas[identifier] = getSchemaObject(schemaData, items);
        }
    });

    return schemas;
};
