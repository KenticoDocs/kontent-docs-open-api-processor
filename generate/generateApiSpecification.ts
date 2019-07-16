import {
    InfoObject,
    OpenApiSpec,
    PathsObject,
    ServerObject,
    TagObject,
} from '@loopback/openapi-v3-types';
import {
    ICategory,
    IContact,
    ILicense,
    IPathOperation,
    IPreprocessedData,
    IServer,
    IZapiSpecification,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    getChildCodenamesFromRichText,
    getItemData,
    isNonEmptyString,
} from '../utils/helpers';

export const generateApiSpecification = (data: IPreprocessedData): OpenApiSpec => {
    const items = data.items;
    const apiSpecification: IZapiSpecification = items[data.zapiSpecificationCodename];

    return {
        // components: resolveComponentsObject(apiSpecification, items),
        info: resolveInfoObject(apiSpecification, items),
        openapi: '3.0.2',
        paths: resolvePathObjects(apiSpecification.pathOperations, items),
        security: [],
        servers: resolveServerObjects(apiSpecification.servers, items),
        tags: resolveTagObjects(apiSpecification.categories, items),
    };
};

const resolveInfoObject = (apiSpecification: IZapiSpecification, items: unknown): InfoObject => {
    // TODO process Description Rich Text Element !!!!!!!!!!!!!!!

    const infoObject: InfoObject = {
        description: apiSpecification.description,
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

        // TODO process Description Rich Text Element !!!!!!!!!!!!!!!

        return {
            description: category.description,
            name: category.name,
        };
    });

const resolvePathObjects = (pathOperationsCodenames: string[], items: unknown): PathsObject => {
    const pathsObject = {};

    pathOperationsCodenames.forEach((codename) => {
        const pathObject = getItemData<IPathOperation>(codename, items);

        // TODO process Description Rich Text Element !!!!!!!!!!!!!!!
        const tagsList = pathObject.category.map((categoryCodename) => {
            const category = getItemData<ICategory>(categoryCodename, items);

            return category.name;
        });

        pathsObject[pathObject.path][pathObject.pathOperation] = {
            deprecated: pathObject.deprecated,
            description: pathObject.description,
            operationId: pathObject.url,
            parameters: pathObject.parameters, // TODO Resolve parameters
            requestBody: pathObject.requestBody, // TODO Resolve
            // TODO Check how code samples of pathsObject will be resolved
            responses: pathObject.responses, // TODO resolve
            summary: pathObject.name,
            tags: tagsList,
        };
    });

    return pathsObject;
};
