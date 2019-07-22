import {
    ComponentsObject,
    HeadersObject,
    InfoObject,
    OpenApiSpec,
    ParameterLocation,
    ParameterObject,
    PathsObject,
    ReferenceObject,
    RequestBodyObject,
    ResponseObject,
    ResponsesObject,
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
    addBooleanProperty,
    addMultipleChoiceProperty,
    addNonEmptyStringProperty,
    getChildCodenamesFromRichText,
    getChildInfosFromRichText,
    getItemData,
    getReferenceObject,
} from '../utils/helpers';
import {
    processRichTextWithCallouts,
    processRichTextWithComponents,
} from '../utils/richTextProcessing';

const parametersComponents = {};
const requestBodiesComponents = {};
const responseComponents = {};

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
    };
    addNonEmptyStringProperty(apiSpecification.termsOfService, 'termsOfService', infoObject);
    resolveContactObject(apiSpecification, items, infoObject);
    resolveLicenseObject(apiSpecification, items, infoObject);

    return infoObject;
};

const resolveContactObject = (apiSpecification: IZapiSpecification, items: unknown, infoObject: InfoObject): void => {
    if (apiSpecification.contact.length === 1) {
        const contactCodename = apiSpecification.contact[0];
        const contact = getItemData<IContact>(contactCodename, items);
        const { apiReference, ...contactObject } = contact;

        infoObject.contact = contactObject;
    }
};

const resolveLicenseObject = (apiSpecification: IZapiSpecification, items: unknown, infoObject: InfoObject): void => {
    if (apiSpecification.license.length === 1) {
        const licenseCodename = apiSpecification.license[0];
        const license: ILicense = getItemData<ILicense>(licenseCodename, items);
        const { apiReference, ...licenseObject } = license;

        infoObject.license = licenseObject;
    }
};

const resolveServerObjects = (serversElement: string, items: unknown): ServerObject[] => {
    const serverCodenames = getChildCodenamesFromRichText(serversElement);

    return serverCodenames.map((codename) => {
        const serverObject = getItemData<IServer>(codename, items);

        return {
            description: serverObject.description,
            url: serverObject.url,
        };
    });
};

const resolveTagObjects = (categoriesCodenames: string[], items: unknown): TagObject[] =>
    categoriesCodenames.map((codename) => {
        const category = getItemData<ICategory>(codename, items);

        return {
            description: processRichTextWithComponents(category.description, items),
            name: category.name,
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
        const categoryObject = getItemData<ICategory>(codename, items);

        categoryObject.pathOperations.forEach((pathOperationCodename) => {
            pathOperationsData.add({
                categoryName: categoryObject.name,
                codename: pathOperationCodename,
            });
        });
    });

    pathOperationsData.forEach((operationData) => {
        const pathOperationObject = getItemData<IPathOperation>(operationData.codename, items);
        const pathOperation = pathOperationObject.pathOperation[0].toLowerCase();

        // Trim() is here because one path's blank space at the beginning makes YML file invalid
        const trimmedPath = pathOperationObject.path.trim();

        if (!pathsObject[trimmedPath]) {
            pathsObject[trimmedPath] = {};
        }

        pathsObject[trimmedPath][pathOperation] = {
            description: processRichTextWithComponents(pathOperationObject.description, items),
            operationId: pathOperationObject.url,
            parameters: resolveParameterObjects(pathOperationObject.parameters, items),
            summary: pathOperationObject.name,
            tags: [operationData.categoryName],
        };

        const path = pathsObject[trimmedPath][pathOperation];

        addBooleanProperty(pathOperationObject.deprecated, 'deprecated', path);

        const requestBody = resolveRequestBodyObject(pathOperationObject.requestBody, items);
        if (requestBody) {
            path.requestBody = requestBody;
        }
        const responses = resolveResponseObjects(pathOperationObject.responses, items);
        if (responses) {
            path.responses = responses;
        }

        if (pathOperationObject.codeSamples.length === 1) {
            const codeSamplesCodename = pathOperationObject.codeSamples[0];
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
    const parameterObject = getItemData<IParameter>(codename, items);
    const name = parameterObject.name;

    if (!parametersComponents.hasOwnProperty(name)) {
        const parameter: ParameterObject = {
            description: processRichTextWithCallouts(parameterObject.description, items),
            in: parameterObject.location[0] as ParameterLocation,
            name,
        };

        addNonEmptyStringProperty(parameterObject.example, 'example', parameter);
        addMultipleChoiceProperty(parameterObject.style, 'style', parameter);
        addBooleanProperty(parameterObject.deprecated, 'deprecated', parameter);
        addBooleanProperty(parameterObject.required, 'required', parameter);
        addBooleanProperty(parameterObject.explode, 'explode', parameter);
        // TODO process schemas

        parametersComponents[name] = parameter;
    }

    return getReferenceObject('parameters', name);
};

const resolveRequestBodyObject = (richTextField: string, items: unknown): RequestBodyObject | ReferenceObject => {
    const requestBodyInfo = getChildInfosFromRichText(richTextField);
    if (requestBodyInfo.length === 1) {
        const codename = requestBodyInfo[0].codename;
        const requestBodyObject = getItemData<IRequestBody>(codename, items);

        // TODO process schemas
        // TODO figure out where to put example element
        const requestBody: RequestBodyObject = {
            content: {},
            description: requestBodyObject.description,
        };
        requestBody.content[requestBodyObject.mediaType[0]] = {
            // schema: 'TODO' as any,
        };

        addBooleanProperty(requestBodyObject.required, 'required', requestBody);

        if (requestBodyInfo[0].isItem) {
            const name = 'requestBody_' + codename;
            requestBodiesComponents[name] = requestBody;

            return getReferenceObject('requestBodies', name);
        } else {
            return requestBody;
        }
    }
};

const resolveResponseObjects = (richTextField: string, items: unknown): ResponsesObject => {
    const responsesObject: ResponsesObject = {};

    const responsesInfo = getChildInfosFromRichText(richTextField);
    responsesInfo.forEach((responseInfo) => {
        const codename = responseInfo.codename;
        const responseObject = getItemData<IResponse>(codename, items);
        const headers = resolveHeadersObjects(responseObject.headers, items);

        const response: ResponseObject = {
            description: processRichTextWithCallouts(responseObject.description, items),
        };

        if (headers) {
            response.headers = headers;
        }

        if (responseObject.mediaType.length === 1) {
            response.content = {
                [responseObject.mediaType[0]]: {
                    // schema: ... TODO process schemas
                    example: responseObject.example,
                },
            };
        }

        const statusCode = parseInt(responseObject.httpStatus[0], 10);
        if (responseInfo.isItem) {
            const name = responseInfo.codename;
            responseComponents[name] = response;

            responsesObject[statusCode] = getReferenceObject('responses', name);
        } else {
            responsesObject[statusCode] = response;
        }
    });

    return responsesObject;
};

const resolveHeadersObjects = (codenames: string[], items: unknown): HeadersObject =>
    codenames
        .map((codename) => {
            const parameterObject = getItemData<IParameter>(codename, items);
            const name = parameterObject.name;

            return {
                [name]: getParameterReference(codename, items),
            };
        })
        .reduce((accumulated, current) => Object.assign(accumulated, current), {});

const resolveComponentsObject = (apiSpecification: IZapiSpecification, items: unknown): ComponentsObject => {
    const securitySchemes = resolveSecuritySchemeObject(apiSpecification, items);
    const securityComponents = securitySchemes
        ? { [securitySchemes.name]: securitySchemes }
        : undefined;

    // TODO Handle all the other component items - are there any more we need, though?

    return {
        parameters: parametersComponents,
        requestBodies: requestBodiesComponents,
        responses: responseComponents,
        securitySchemes: securityComponents,
    };
};

const resolveSecuritySchemeObject = (apiSpecification: IZapiSpecification, items: unknown): SecuritySchemeObject => {
    if (apiSpecification.security.length === 1) {
        const securitySchemeObject = getItemData<ISecurityScheme>(apiSpecification.security[0], items);

        const securityScheme = {
            description: processRichTextWithCallouts(securitySchemeObject.description, items),
            // scheme: securitySchemeObject.scheme, TODO process schemas
            type: securitySchemeObject.type[0] as SecuritySchemeType,
        };
        addMultipleChoiceProperty(securitySchemeObject.apiKeyLocation, 'apiKeyLocation', securityScheme);
        addNonEmptyStringProperty(securitySchemeObject.name, 'name', securityScheme);
        addNonEmptyStringProperty(securitySchemeObject.bearerFormat, 'bearerFormat', securityScheme);

        return securityScheme;
    }
};
