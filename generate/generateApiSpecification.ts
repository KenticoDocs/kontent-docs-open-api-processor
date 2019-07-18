import {
    ComponentsObject,
    InfoObject,
    OpenApiSpec,
    ParameterObject,
    PathsObject,
    ReferenceObject,
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
    ISecurityScheme,
    IServer,
    IZapiSpecification,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    addProperty,
    getChildCodenamesFromRichText,
    getItemData,
    isNonEmptyString,
} from '../utils/helpers';
import {
    processRichTextWithCallouts,
    processRichTextWithComponents,
} from '../utils/richTextProcessing';

const parameters = new Set<ParameterObject>();

export const generateApiSpecification = (data: IPreprocessedData): OpenApiSpec => {
    const items = data.items;
    const apiSpecification: IZapiSpecification = items[data.zapiSpecificationCodename];
    const components: ComponentsObject = resolveComponentsObject(apiSpecification, items);

    return {
        components,
        info: resolveInfoObject(apiSpecification, items),
        openapi: '3.0.2',
        paths: resolvePathsObject(apiSpecification.categories, items),
        security: [],
        servers: resolveServerObjects(apiSpecification.servers, items),
        tags: resolveTagObjects(apiSpecification.categories, items),
    };
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
                requestBody: pathOperationObject.requestBody, // TODO Resolve
                responses: pathOperationObject.responses, // TODO resolve
                summary: pathOperationObject.name,
                // TODO Check how code samples of pathsObject will be resolved
                tags: [operationData.categoryName],
            },
        };
    });

    return pathsObject;
};

const resolveParameterObjects = (codenames: string[], items: unknown): ReferenceObject[] => {
    return codenames.map((codename) => {
        const parameterObject = getItemData<IParameter>(codename, items);

        return {
            $ref: '#/components/parameters' + parameterObject.name,
        };
    });
};

const resolveComponentsObject = (apiSpecification: IZapiSpecification, items: unknown): ComponentsObject => {
    const securitySchemes = resolveSecuritySchemeObject(apiSpecification, items);

    // TODO Handle all the other component items

    return {
        securitySchemes: {
            [securitySchemes.name]: securitySchemes,
        },
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
