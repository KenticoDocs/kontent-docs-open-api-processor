import {
    ComponentsObject,
    HeadersObject,
    InfoObject,
    OpenApiSpec,
    ParameterLocation,
    ParameterObject,
    ParameterStyle,
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
    addProperty,
    getChildCodenamesFromRichText,
    getChildInfosFromRichText,
    getItemData,
    isNonEmptyString,
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

    if (isNonEmptyString(apiSpecification.termsOfService)) {
        infoObject.termsOfService = apiSpecification.termsOfService;
    }

    if (apiSpecification.contact.length === 1) {
        const contactCodename = apiSpecification.contact[0];
        const contact = getItemData<IContact>(contactCodename, items);
        const { apiReference, ...contactObject } = contact;

        infoObject.contact = contactObject;
    }

    if (apiSpecification.license.length === 1) {
        const licenseCodename = apiSpecification.license[0];
        const license: ILicense = getItemData<ILicense>(licenseCodename, items);
        const { apiReference, ...licenseObject } = license;

        infoObject.license = licenseObject;
    }

    return infoObject;
};

const resolveServerObjects = (serversElement: string, items: unknown): ServerObject[] => {
    const serverCodenames = getChildCodenamesFromRichText(serversElement);

    return serverCodenames.map((codename) => getItemData<IServer>(codename, items));
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
        const pathOperation = pathOperationObject.pathOperation[0];

        pathsObject[pathOperationObject.path] = {
            [pathOperation]: {
                deprecated: pathOperationObject.deprecated,
                description: processRichTextWithComponents(pathOperationObject.description, items),
                operationId: pathOperationObject.url,
                parameters: resolveParameterObjects(pathOperationObject.parameters, items),
                summary: pathOperationObject.name,
                // TODO Check how code samples of pathsObject will be resolved
                tags: [operationData.categoryName],
            },
        };

        const requestBody = resolveRequestBodyObject(pathOperationObject.requestBody, items);
        if (requestBody) {
            pathsObject[pathOperationObject.path][pathOperation].requestBody = requestBody;
        }
        const responses = resolveResponseObjects(pathOperationObject.responses, items);
        if (responses) {
            pathsObject[pathOperationObject.path][pathOperation].responses = responses;
        }
    });

    return pathsObject;
};

const resolveParameterObjects = (codenames: string[], items: unknown): ReferenceObject[] =>
    codenames.map((codename) => getParameterReference(codename, items));

const getParameterReference = (codename, items: unknown) => {
    const parameterObject = getItemData<IParameter>(codename, items);
    const name = parameterObject.name;

    if (!parametersComponents.hasOwnProperty(name)) {
        const parameter: ParameterObject = {
            description: processRichTextWithCallouts(parameterObject.description, items),
            in: parameterObject.location[0] as ParameterLocation,
            name,
        };

        if (parameterObject.deprecated.length === 1) {
            parameter.deprecated = parameterObject.deprecated[0] === 'true';
        }
        if (isNonEmptyString(parameterObject.example)) {
            parameter.example = parameterObject;
        }
        if (parameterObject.required.length === 1) {
            parameter.required = parameterObject.required[0] === 'true';
        }
        if (parameterObject.style.length === 1) {
            parameter.style = parameterObject.style[0] as ParameterStyle;
        }
        if (parameterObject.explode.length === 1) {
            parameter.explode = parameterObject.explode[0] === 'true';
        }
        // TODO process schemas

        parametersComponents[name] = parameter;
    }

    return {
        $ref: '#/components/parameters/' + name,
    };
};

const resolveRequestBodyObject = (richTextField: string, items: unknown): RequestBodyObject | ReferenceObject => {
    const requestBodyInfo = getChildInfosFromRichText(richTextField);
    if (requestBodyInfo.length === 1) {
        const codename = requestBodyInfo[0].codename;
        const requestBodyObject = getItemData<IRequestBody>(codename, items);

        // TODO process schemas
        // TODO figure out where to put example element
        const requestBody: RequestBodyObject = {
            content: {
                [requestBodyObject.mediaType[0]]: {
                    schema: 'TODO' as any,
                },
            },
            description: requestBodyObject.description,
        };
        if (requestBodyObject.required.length === 1) {
            requestBody.required = requestBodyObject.required[0] === 'true';
        }

        if (requestBodyInfo[0].isItem) {
            const name = 'requestBody_' + codename;
            requestBodiesComponents['requestBody_' + codename] = requestBody;

            return {
                $ref: '#/components/requestBodies/' + name,
            };
        } else {
            return requestBody;
        }
    }
};

const resolveResponseObjects = (richTextField: string, items: unknown): ResponsesObject => {
    const responsesObject: ResponsesObject = {};

    // TODO Add responses to componentsObject if appropriate
    const responsesInfo = getChildInfosFromRichText(richTextField);
    responsesInfo.forEach((responseInfo) => {
        const codename = responseInfo.codename;
        const responseObject = getItemData<IResponse>(codename, items);

        const response: ResponseObject = {
            description: processRichTextWithCallouts(responseObject.description, items),
            headers: resolveHeadersObjects(responseObject.headers, items),
        };

        if (responseObject.mediaType.length === 1) {
            response.content = {
                [responseObject.mediaType[0]]: {
                    // schema: ... TODO process schemas
                    example: responseObject.example,
                },
            };
        }

        responsesObject[responseObject.mediaType[0]] = response;
    });

    return responsesObject;
};

const resolveHeadersObjects = (codenames: string[], items: unknown): HeadersObject => {
    const headers = {};
    codenames.forEach((codename) => {
        const parameterObject = getItemData<IParameter>(codename, items);
        const name = parameterObject.name;

        headers[name] = getParameterReference(codename, items);
    });

    return headers;
};

const resolveComponentsObject = (apiSpecification: IZapiSpecification, items: unknown): ComponentsObject => {
    const securitySchemes = resolveSecuritySchemeObject(apiSpecification, items);
    const securityComponents = securitySchemes
        ? { [securitySchemes.name]: securitySchemes }
        : undefined;

    // TODO Handle all the other component items

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
            scheme: securitySchemeObject.scheme,
            type: securitySchemeObject.type[0] as SecuritySchemeType,
        };
        const securitySchemeName = securitySchemeObject.name;
        addProperty(securityScheme, 'name', securitySchemeName);
        addProperty(securityScheme, 'bearerFormat', securitySchemeObject.bearerFormat);
        addProperty(securityScheme, 'in', securitySchemeObject.apiKeyLocation);

        return securityScheme;
    }
};
