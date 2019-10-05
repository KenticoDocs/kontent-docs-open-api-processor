import {
    BaseParameterObject,
    ComponentsObject,
    HeadersObject,
    InfoObject,
    OpenApiSpec,
    OperationObject,
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
    IPreprocessedItems,
    IRequestBody,
    IResponse,
    ISecurityScheme,
    IServer,
    IZapiSpecification,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import { fixPrimaryHeadings } from '../utils/commonMarkProcessing';
import {
    getBooleanProperty,
    getDescriptionProperty,
    getHeadersProperty,
    getMultipleChoiceProperty,
    getNonEmptyStringAsObjectProperty,
    getNonEmptyStringProperty,
    getSchemaProperty,
} from '../utils/getProperties';
import {
    getItemData,
    getReferenceObject,
    isNonEmptyTextOrRichTextLinksElement,
} from '../utils/helpers';
import {
    getChildCodenamesFromRichText,
    getChildrenInfosFromRichText,
    processRichTextWithChildren,
    processRichTextWithOnlyCallouts,
} from '../utils/richTextProcessing';
import {
    getSchemaObject,
    ISchemas,
} from './getSchemaObjects';

interface ISecuritychemeObject {
    [name: string]: SecuritySchemeObject;
}

interface IPathOperationInfo {
    readonly categoryName: string;
    readonly codename: string;
}

export class ApiSpecificationGenerator {
    private readonly parametersComponents;
    private readonly requestBodiesComponents;
    private readonly responseComponents;
    private readonly schemasComponents;

    private readonly processedSchemaObjects;
    private recursiveSchemaCodenames;

    constructor() {
        this.parametersComponents = {};
        this.requestBodiesComponents = {};
        this.responseComponents = {};
        this.schemasComponents = {};

        this.processedSchemaObjects = {};
        this.recursiveSchemaCodenames = [];
    }

    public generateApiSpecification = (data: IPreprocessedData): OpenApiSpec => {
        const items = data.items;
        const apiSpecification = items[data.zapiSpecificationCodename] as IZapiSpecification;

        const openApiSpecification: OpenApiSpec = {
            info: this.resolveInfoObject(apiSpecification, items),
            openapi: '3.0.2',
            paths: this.resolvePathsObject(apiSpecification.categories, items),
            servers: this.resolveServerObjects(apiSpecification.servers, items),
            tags: this.resolveTagObjects(apiSpecification.categories, items),
            ...getMultipleChoiceProperty(apiSpecification.apiStatus, 'x-api-status'),
        };

        openApiSpecification.components = this.resolveComponentsObject();

        const securitySchemeObject = this.resolveSecurityScheme(apiSpecification, items, openApiSpecification);
        if (securitySchemeObject) {
            openApiSpecification.components.securitySchemes = securitySchemeObject;
        }

        return openApiSpecification;
    };

    public resolveSchemaObjectsInLinkedItems = (element: string[], items: IPreprocessedItems): SchemaObject[] => {
        const schemas = [];
        element.map((codename) => {
            const schemaData = getItemData<ISchemas>(codename, items);
            const identifier = isNonEmptyTextOrRichTextLinksElement(schemaData.name)
                ? schemaData.name
                : codename;

            this.schemasComponents[identifier] = getSchemaObject(schemaData, items);
            const schemaReferenceObject = getReferenceObject('schemas', identifier);
            schemas.push(schemaReferenceObject);
            this.processedSchemaObjects[identifier] = schemaReferenceObject;
        });

        return schemas;
    };

    public resolveSchemaObjectsInRichTextElement = (element: string, items: IPreprocessedItems): SchemaObject[] => {
        const schemas = [];
        const childrenInfos = getChildrenInfosFromRichText(element);

        childrenInfos.forEach((schemaInfo) => {
            const schemaData = getItemData<ISchemas>(schemaInfo.codename, items);

            if (schemaData.contentType.includes('schema')) {
                const identifier = isNonEmptyTextOrRichTextLinksElement(schemaData.name)
                    ? schemaData.name
                    : schemaInfo.codename;

                if (!this.processedSchemaObjects[identifier]) {
                    this.processedSchemaObjects[identifier] = 'being processed';

                    if (schemaInfo.isItem) {
                        const schemaReferenceObject = getReferenceObject('schemas', identifier);
                        schemas.push(schemaReferenceObject);
                        this.processedSchemaObjects[identifier] = schemaReferenceObject;

                        this.schemasComponents[identifier] = getSchemaObject(schemaData, items);
                    } else {
                        const schemaObject = {};
                        schemaObject[identifier] = getSchemaObject(schemaData, items);
                        schemas.push(schemaObject);

                        this.processedSchemaObjects[identifier] = schemaObject;
                    }
                } else {
                    if (this.processedSchemaObjects[identifier] === 'being processed') {
                        // The schema is still being processed - link only a reference to it
                        this.recursiveSchemaCodenames.push(identifier);
                        schemas.push({
                            [identifier]: getReferenceObject('schemas', identifier),
                        });
                    } else {
                        schemas.push(this.processedSchemaObjects[identifier]);
                    }
                }
            }
        });

        return schemas;
    };

    private resolveInfoObject = (apiSpecification: IZapiSpecification, items: IPreprocessedItems): InfoObject => {
        // Only InfoObject's description can contain <h1> heading
        const description = fixPrimaryHeadings(processRichTextWithChildren(apiSpecification.description, items));

        const infoObject: InfoObject = {
            description,
            title: apiSpecification.title,
            version: apiSpecification.version,
            ...getNonEmptyStringProperty(apiSpecification.termsOfService, 'termsOfService'),
        };
        this.resolveContactObject(apiSpecification, items, infoObject);
        this.resolveLicenseObject(apiSpecification, items, infoObject);

        return infoObject;
    };

    private resolveContactObject = (
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

    private resolveLicenseObject = (
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

    private resolveServerObjects = (serversElement: string, items: IPreprocessedItems): ServerObject[] => {
        const serverCodenames = getChildCodenamesFromRichText(serversElement);

        return serverCodenames.map((codename) => {
            const serverData = getItemData<IServer>(codename, items);

            return {
                description: serverData.description,
                url: serverData.url,
            };
        });
    };

    private resolveTagObjects = (categoriesCodenames: string[], items: IPreprocessedItems): TagObject[] =>
        categoriesCodenames.map((codename) => {
            const categoryData = getItemData<ICategory>(codename, items);
            this.resolveSchemaObjectsInRichTextElement(categoryData.description, items);

            return {
                description: processRichTextWithChildren(categoryData.description, items),
                name: categoryData.name,
            };
        });

    private getParameterReference = (codename, items: IPreprocessedItems): ReferenceObject => {
        const parameterData = getItemData<IParameter>(codename, items);
        const schema = this.resolveSchemaObjectsInLinkedItems(parameterData.schema, items);

        if (!this.parametersComponents.hasOwnProperty(codename)) {
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
            this.resolveParameterExample(parameterData, parameterObject, items);

            this.parametersComponents[codename] = parameterObject;
        }

        return getReferenceObject('parameters', codename);
    };

    private resolveParameterExample = (
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

    private resolveRequestBodyObject = (
        richTextField: string,
        items: IPreprocessedItems,
    ): RequestBodyObject | ReferenceObject => {
        const requestBodyInfo = getChildrenInfosFromRichText(richTextField);
        if (requestBodyInfo.length === 1) {
            const codename = requestBodyInfo[0].codename;
            const requestBodyData = getItemData<IRequestBody>(codename, items);
            const schema = this.resolveSchemaObjectsInRichTextElement(requestBodyData.schema, items);

            const requestBodyObject: RequestBodyObject = {
                content: {},
                ...getDescriptionProperty(requestBodyData.description, 'description', items),
                ...getBooleanProperty(requestBodyData.required, 'required'),

            };
            requestBodyObject.content[requestBodyData.mediaType[0]] = {
                ...getSchemaProperty(schema, 'schema'),
                ...getNonEmptyStringAsObjectProperty(requestBodyData.example, 'example'),
            };

            if (requestBodyInfo[0].isItem) {
                const name = 'requestBody_' + codename;
                this.requestBodiesComponents[name] = requestBodyObject;

                return getReferenceObject('requestBodies', name);
            } else {
                return requestBodyObject;
            }
        }
    };

    private resolveResponseObjects = (richTextField: string, items: IPreprocessedItems): ResponsesObject => {
        const responsesObject: ResponsesObject = {};

        const responsesInfo = getChildrenInfosFromRichText(richTextField);
        responsesInfo.forEach((responseInfo) => {
            const codename = responseInfo.codename;
            const responseData = getItemData<IResponse>(codename, items);
            const headers = this.resolveHeadersObjects(responseData.headers, items);

            const responseObject: ResponseObject = {
                description: processRichTextWithOnlyCallouts(responseData.description, items),
                ...getHeadersProperty(headers, 'headers'),
            };

            const schema = this.resolveSchemaObjectsInRichTextElement(responseData.schema, items);

            if (responseData.mediaType.length === 1) {
                responseObject.content = {
                    [responseData.mediaType[0]]: {
                        ...getSchemaProperty(schema, 'schema'),
                        ...getNonEmptyStringAsObjectProperty(responseData.example, 'example'),
                    },
                };
            }

            const statusCode = parseInt(responseData.httpStatus[0], 10);
            if (responseInfo.isItem) {
                const name = responseInfo.codename;
                this.responseComponents[name] = responseObject;
                responsesObject[statusCode] = getReferenceObject('responses', name);
            } else {
                responsesObject[statusCode] = responseObject;
            }
        });

        return responsesObject;
    };

    private resolveHeadersObjects = (codenames: string[], items: IPreprocessedItems): HeadersObject =>
        codenames
            .map((codename) => {
                const parameterData = getItemData<IParameter>(codename, items);
                const name = parameterData.name;

                return {
                    [name]: this.getParameterReference(codename, items),
                };
            })
            .reduce((accumulated, current) => Object.assign(accumulated, current), {});

    private resolveComponentsObject = (): ComponentsObject => {
        this.recursiveSchemaCodenames.forEach((codename) => {
            this.schemasComponents[codename] = this.processedSchemaObjects[codename][codename];
        });

        return {
            parameters: this.parametersComponents,
            requestBodies: this.requestBodiesComponents,
            responses: this.responseComponents,
            schemas: this.schemasComponents,
        };
    };

    private resolveSecurityScheme = (
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

    private resolvePathsObject = (categoriesCodenames: string[], items: IPreprocessedItems): PathsObject => {
        const pathsObject = {};
        const pathOperationsData = this.getPathOperationsInfo(categoriesCodenames, items);

        pathOperationsData.forEach((operationData) => {
            const pathOperationData = getItemData<IPathOperation>(operationData.codename, items);
            const pathMethod = this.resolvePathOperation(pathOperationData, pathsObject, items, operationData);

            const requestBody = this.resolveRequestBodyObject(pathOperationData.requestBody, items);
            if (requestBody) {
                pathMethod.requestBody = requestBody;
            }
            const responses = this.resolveResponseObjects(pathOperationData.responses, items);
            if (responses) {
                pathMethod.responses = responses;
            }

            this.resolvePathOperationCodeSamples(pathOperationData, items, pathMethod);
        });

        return pathsObject;
    };

    private getPathOperationsInfo = (
        categoriesCodenames: string[],
        items: IPreprocessedItems,
    ): Set<IPathOperationInfo> => {
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

    private resolvePathOperation = (
        pathOperationData: IPathOperation,
        pathsObject: PathsObject,
        items: IPreprocessedItems,
        pathOperationInfo: IPathOperationInfo,
    ): OperationObject => {
        const pathOperation = pathOperationData.pathOperation[0].toLowerCase();
        const path = pathOperationData.path;

        if (!pathsObject[path]) {
            pathsObject[path] = {};
        }

        pathsObject[path][pathOperation] = {
            description: processRichTextWithChildren(pathOperationData.description, items),
            operationId: pathOperationData.url,
            parameters: this.resolveParameterObjects(pathOperationData.parameters, items),
            summary: pathOperationData.name,
            tags: [pathOperationInfo.categoryName],
            ...getBooleanProperty(pathOperationData.deprecated, 'deprecated'),
        };

        return pathsObject[path][pathOperation];
    };

    private resolveParameterObjects = (codenames: string[], items: IPreprocessedItems): ReferenceObject[] =>
        codenames.map((codename) => this.getParameterReference(codename, items));

    private resolvePathOperationCodeSamples = (pathOperationData, items: IPreprocessedItems, pathMethod): void => {
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
}
