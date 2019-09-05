import {
    BaseParameterObject,
    ComponentsObject,
    HeadersObject,
    InfoObject,
    OpenApiSpec,
    ParameterLocation,
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
    IContact,
    ILicense,
    IParameter,
    IPreprocessedData,
    IPreprocessedItems,
    IRequestBody,
    IResponse,
    ISecurityScheme,
    IServer,
    IZapiSpecification,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    getBooleanProperty,
    getDescriptionProperty,
    getHeadersProperty,
    getMultipleChoiceProperty,
    getNonEmptyStringProperty,
    getSchemaProperty,
} from '../utils/getProperties';
import {
    getChildCodenamesFromRichText,
    getChildrenInfosFromRichText,
    getItemData,
    getReferenceObject,
    isNonEmptyTextOrRichTextLinks,
} from '../utils/helpers';
import {
    processRichTextWithChildren,
    processRichTextWithOnlyCallouts,
} from '../utils/richTextProcessing';
import { resolvePathsObject } from './getPathsObject';
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
    const apiSpecification = items[data.zapiSpecificationCodename] as IZapiSpecification;

    const openApiSpecification: OpenApiSpec = {
        info: resolveInfoObject(apiSpecification, items),
        openapi: '3.0.2',
        paths: resolvePathsObject(apiSpecification.categories, items),
        servers: resolveServerObjects(apiSpecification.servers, items),
        tags: resolveTagObjects(apiSpecification.categories, items),
        ...getMultipleChoiceProperty(apiSpecification.apiStatus, 'x-api-status'),
    };

    openApiSpecification.components = resolveComponentsObject();

    const securitySchemeObject = resolveSecurityScheme(apiSpecification, items, openApiSpecification);
    if (securitySchemeObject) {
        openApiSpecification.components.securitySchemes = securitySchemeObject;
    }

    return openApiSpecification;
};

const resolveInfoObject = (apiSpecification: IZapiSpecification, items: IPreprocessedItems): InfoObject => {
    const infoObject: InfoObject = {
        description: processRichTextWithChildren(apiSpecification.description, items),
        title: apiSpecification.title,
        version: apiSpecification.version,
        ...getNonEmptyStringProperty(apiSpecification.termsOfService, 'termsOfService'),
    };
    resolveContactObject(apiSpecification, items, infoObject);
    resolveLicenseObject(apiSpecification, items, infoObject);

    return infoObject;
};

const resolveContactObject = (
    apiSpecification: IZapiSpecification,
    items: IPreprocessedItems,
    infoObject: InfoObject,
): void => {
    if (apiSpecification.contact.length === 1) {
        const contactCodename = apiSpecification.contact[0];
        const contactData = getItemData<IContact>(contactCodename, items);
        const { apiReference, ...contactObject } = contactData;

        infoObject.contact = contactObject;
    }
};

const resolveLicenseObject = (
    apiSpecification: IZapiSpecification,
    items: IPreprocessedItems,
    infoObject: InfoObject,
): void => {
    if (apiSpecification.license.length === 1) {
        const licenseCodename = apiSpecification.license[0];
        const licenseData: ILicense = getItemData<ILicense>(licenseCodename, items);
        const { apiReference, ...licenseObject } = licenseData;

        infoObject.license = licenseObject;
    }
};

const resolveServerObjects = (serversElement: string, items: IPreprocessedItems): ServerObject[] => {
    const serverCodenames = getChildCodenamesFromRichText(serversElement);

    return serverCodenames.map((codename) => {
        const serverData = getItemData<IServer>(codename, items);

        return {
            description: serverData.description,
            url: serverData.url,
        };
    });
};

const resolveTagObjects = (categoriesCodenames: string[], items: IPreprocessedItems): TagObject[] =>
    categoriesCodenames.map((codename) => {
        const categoryData = getItemData<ICategory>(codename, items);
        resolveSchemaObjectsInRichTextElement(categoryData.description, items);

        return {
            description: processRichTextWithChildren(categoryData.description, items),
            name: categoryData.name,
        };
    });

export const getParameterReference = (codename, items: IPreprocessedItems): ReferenceObject => {
    const parameterData = getItemData<IParameter>(codename, items);
    const schema = resolveSchemaObjectsInLinkedItems(parameterData.schema, items);

    if (!parametersComponents.hasOwnProperty(codename)) {
        const parameterObject: BaseParameterObject = {
            description: processRichTextWithOnlyCallouts(parameterData.description, items),
            in: parameterData.location[0] as ParameterLocation,
            name: parameterData.name,
            ...getBooleanProperty(parameterData.deprecated, 'deprecated'),
            ...getBooleanProperty(parameterData.required, 'required'),
            ...getBooleanProperty(parameterData.explode, 'explode'),
            ...getMultipleChoiceProperty(parameterData.style, 'style'),
            ...getSchemaProperty(schema, 'schema'),
        };
        resolveParameterExample(parameterData, parameterObject, items);

        parametersComponents[codename] = parameterObject;
    }

    return getReferenceObject('parameters', codename);
};

const resolveParameterExample = (
    parameterData: IParameter,
    parameterObject: BaseParameterObject,
    items: IPreprocessedItems,
): void => {
    const schemaData = getItemData<ISchemas>(parameterData.schema[0], items);
    const schemaType = schemaData.contentType;
    const exampleValue = parameterData.example;
    if (exampleValue) {
        switch (schemaType) {
            case 'zapi_schema__integer':
            case 'zapi_schema__number': {
                parameterObject.example = parseInt(exampleValue, 10);
                break;
            }
            case 'zapi_schema__boolean': {
                parameterObject.example = exampleValue === 'true';
                break;
            }
            default: {
                parameterObject.example = exampleValue;
                break;
            }
        }
    }
};

export const resolveRequestBodyObject = (
    richTextField: string,
    items: IPreprocessedItems,
): RequestBodyObject | ReferenceObject => {
    const requestBodyInfo = getChildrenInfosFromRichText(richTextField);
    if (requestBodyInfo.length === 1) {
        const codename = requestBodyInfo[0].codename;
        const requestBodyData = getItemData<IRequestBody>(codename, items);
        const schema = resolveSchemaObjectsInRichTextElement(requestBodyData.schema, items);

        const requestBodyObject: RequestBodyObject = {
            content: {},
            ...getDescriptionProperty(requestBodyData.description, 'description', items),
            ...getBooleanProperty(requestBodyData.required, 'required'),

        };
        requestBodyObject.content[requestBodyData.mediaType[0]] = {
            ...getSchemaProperty(schema, 'schema'),
            ...getNonEmptyStringProperty(requestBodyData.example, 'example'),
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

export const resolveResponseObjects = (richTextField: string, items: IPreprocessedItems): ResponsesObject => {
    const responsesObject: ResponsesObject = {};

    const responsesInfo = getChildrenInfosFromRichText(richTextField);
    responsesInfo.forEach((responseInfo) => {
        const codename = responseInfo.codename;
        const responseData = getItemData<IResponse>(codename, items);
        const headers = resolveHeadersObjects(responseData.headers, items);

        const responseObject: ResponseObject = {
            description: processRichTextWithOnlyCallouts(responseData.description, items),
            ...getHeadersProperty(headers, 'headers'),
        };

        const schema = resolveSchemaObjectsInRichTextElement(responseData.schema, items);

        if (responseData.mediaType.length === 1) {
            responseObject.content = {
                [responseData.mediaType[0]]: {
                    ...getSchemaProperty(schema, 'schema'),
                    ...getNonEmptyStringProperty(responseData.example, 'example'),
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

const resolveHeadersObjects = (codenames: string[], items: IPreprocessedItems): HeadersObject =>
    codenames
        .map((codename) => {
            const parameterData = getItemData<IParameter>(codename, items);
            const name = parameterData.name;

            return {
                [name]: getParameterReference(codename, items),
            };
        })
        .reduce((accumulated, current) => Object.assign(accumulated, current), {});

const resolveComponentsObject = (): ComponentsObject => ({
    parameters: parametersComponents,
    requestBodies: requestBodiesComponents,
    responses: responseComponents,
    schemas: schemasComponents,
});

export interface ISecuritychemeObject {
    [name: string]: SecuritySchemeObject;
}

const resolveSecurityScheme = (
    apiSpecificationData: IZapiSpecification,
    items: IPreprocessedItems,
    openApiSpecification: OpenApiSpec,
): ISecuritychemeObject => {
    if (apiSpecificationData.security.length === 1) {
        const securitySchemeData = getItemData<ISecurityScheme>(apiSpecificationData.security[0], items);

        openApiSpecification.security = [{
            [securitySchemeData.name]: [],
        }];

        return {
            [securitySchemeData.name]: {
                description: processRichTextWithOnlyCallouts(securitySchemeData.description, items),
                type: securitySchemeData.type[0] as SecuritySchemeType,
                ...getMultipleChoiceProperty(securitySchemeData.apiKeyLocation, 'apiKeyLocation'),
                ...getNonEmptyStringProperty(securitySchemeData.scheme, 'scheme'),
                ...getNonEmptyStringProperty(securitySchemeData.bearerFormat, 'bearerFormat'),
            },
        };
    }
};

export const resolveSchemaObjectsInLinkedItems = (element: string[], items: IPreprocessedItems): SchemaObject[] => {
    const schemas = [];
    element.map((codename) => {
        const schemaData = getItemData<ISchemas>(codename, items);
        const identifier = isNonEmptyTextOrRichTextLinks(schemaData.name)
            ? schemaData.name
            : codename;

        schemasComponents[identifier] = getSchemaObject(schemaData, items);
        schemas.push(getReferenceObject('schemas', identifier));
    });

    return schemas;
};

export const resolveSchemaObjectsInRichTextElement = (element: string, items: IPreprocessedItems): SchemaObject[] => {
    const schemas = [];
    const childrenInfos = getChildrenInfosFromRichText(element);

    childrenInfos.forEach((schemaInfo) => {
        const schemaData = getItemData<ISchemas>(schemaInfo.codename, items);

        if (schemaData.contentType.includes('schema')) {
            const identifier = isNonEmptyTextOrRichTextLinks(schemaData.name)
                ? schemaData.name
                : schemaInfo.codename;

            if (schemaInfo.isItem) {
                schemasComponents[identifier] = getSchemaObject(schemaData, items);
                schemas.push(getReferenceObject('schemas', identifier));
            } else {
                const schemaObject = {};
                schemaObject[identifier] = getSchemaObject(schemaData, items);
                schemas.push(schemaObject);
            }
        }
    });

    return schemas;
};
