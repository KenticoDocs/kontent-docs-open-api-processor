import {
    DiscriminatorObject,
    SchemaObject,
} from '@loopback/openapi-v3-types';
import {
    IDiscriminator,
    IDiscriminatorMapItem,
    IPreprocessedItems,
    IPropertyReferencingASchema,
    ISchemaAllOf,
    ISchemaAnyOf,
    ISchemaArray,
    ISchemaBoolean,
    ISchemaElements,
    ISchemaInteger,
    ISchemaNumber,
    ISchemaObject,
    ISchemaObjectPropertyElements,
    ISchemaOneOf,
    ISchemaString,
} from 'cloud-docs-shared-code';
import {
    getArrayPropertyFromString,
    getBooleanProperty,
    getDescriptionProperty,
    getDiscriminatorProperty,
    getMultipleChoiceProperty,
    getNonEmptyStringAsObjectProperty,
    getNonEmptyStringProperty,
    getNumberProperty,
    getSchemaProperty,
} from '../utils/getProperties';
import {
    getChildrenInfosFromRichText,
    getItemData,
} from '../utils/helpers';
import { getApiSpecificationGenerator } from './getApiSpecificationGenerator';

export type ISchemas =
    ISchemaAllOf
    | ISchemaAnyOf
    | ISchemaArray
    | ISchemaBoolean
    | ISchemaInteger
    | ISchemaNumber
    | ISchemaObject
    | ISchemaOneOf
    | ISchemaString
    | IPropertyReferencingASchema;

export interface ISchemasObject {
    readonly [key: string]: SchemaObject;
}

export const getSchemaObject = (schemaData: ISchemas, items: IPreprocessedItems): SchemaObject => {
    switch (schemaData.contentType) {
        case 'zapi_schema__allof': {
            return getSchemaAllOfObject(schemaData as ISchemaAllOf, items);
        }
        case 'zapi_schema__anyof': {
            return getSchemaAnyOfObject(schemaData as ISchemaAnyOf, items);
        }
        case 'zapi_schema__array': {
            return getSchemaArrayObject(schemaData as ISchemaArray, items);
        }
        case 'zapi_schema__boolean': {
            return getSchemaBooleanObject(schemaData as ISchemaBoolean, items);
        }
        case 'zapi_schema__integer': {
            return getSchemaIntegerObject(schemaData as ISchemaInteger, items);
        }
        case 'zapi_schema__number': {
            return getSchemaNumberObject(schemaData as ISchemaNumber, items);
        }
        case 'zapi_schema__object': {
            return getSchemaObjectObject(schemaData as ISchemaObject, items);
        }
        case 'zapi_schema__oneof': {
            return getSchemaOneOfObject(schemaData as ISchemaOneOf, items);
        }
        case 'zapi_schema__string': {
            return getSchemaStringObject(schemaData as ISchemaString, items);
        }
        case 'zapi_property_referencing_a_schema': {
            return getPropertyReferencingObject(schemaData as IPropertyReferencingASchema, items);
        }
        default: {
            return {};
        }
    }
};

const getSchemaAllOfObject = (schemaData: ISchemaAllOf, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items, 'allOf'),
    ...getSchemaProperty(
        getApiSpecificationGenerator()
            .resolveSchemaObjectsInRichTextElement(schemaData.schemas, items), 'allOf',
    ),
});

const getSchemaAnyOfObject = (schemaData: ISchemaAnyOf, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getSchemaProperty(
        getApiSpecificationGenerator()
            .resolveSchemaObjectsInLinkedItems(schemaData.schemas, items), 'anyOf',
    ),
});

const getSchemaArrayObject = (schemaData: ISchemaArray, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaProperty(
        getApiSpecificationGenerator()
            .resolveSchemaObjectsInRichTextElement(schemaData.items, items), 'items',
    ),
    ...getBooleanProperty(schemaData.uniqueItems, 'uniqueItems'),
    type: 'array',
});

const getSchemaBooleanObject = (schemaData: ISchemaBoolean, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    type: 'boolean',
});

const getSchemaIntegerObject = (schemaData: ISchemaInteger, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getArrayPropertyFromString(schemaData.acceptedValues, 'enum'),
    ...getMultipleChoiceProperty(schemaData.format, 'format'),
    ...getNumberProperty(schemaData.defaultValue, 'default'),
    ...getNumberProperty(schemaData.minimum, 'minimum'),
    ...getNumberProperty(schemaData.maximum, 'maximum'),
    type: 'integer',
});

const getSchemaNumberObject = (schemaData: ISchemaNumber, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getArrayPropertyFromString(schemaData.acceptedValues, 'enum'),
    ...getMultipleChoiceProperty(schemaData.format, 'format'),
    ...getNumberProperty(schemaData.minimum, 'minimum'),
    ...getNumberProperty(schemaData.maximum, 'maximum'),
    type: 'number',
});

const getSchemaObjectObject = (schemaData: ISchemaObject, items: IPreprocessedItems): SchemaObject => {
    const apiSpecificationGenerator = getApiSpecificationGenerator();
    const properties = apiSpecificationGenerator
        .resolveSchemaObjectsInRichTextElement(schemaData.properties, items);
    const additionalProperties = apiSpecificationGenerator
        .resolveSchemaObjectsInRichTextElement(schemaData.additionalProperties, items);

    return {
        ...getSchemaCommonElements(schemaData, items, 'object'),
        ...getArrayPropertyFromString(schemaData.required, 'required'),
        ...getSchemaProperty(properties, 'properties'),
        // TODO pridaj dovnutra x-additionalPropertiesName objekt
        ...getSchemaProperty(additionalProperties, 'additionalProperties'),
        type: 'object',
    };
};

const getSchemaOneOfObject = (schemaData: ISchemaOneOf, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getDiscriminatorProperty(schemaData.discriminator, 'discriminator', items),
    ...getSchemaProperty(
        getApiSpecificationGenerator()
            .resolveSchemaObjectsInRichTextElement(schemaData.schemas, items), 'oneOf',
    ),
});

const getSchemaStringObject = (schemaData: ISchemaString, items: IPreprocessedItems): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getArrayPropertyFromString(schemaData.acceptedValues, 'enum'),
    ...getNonEmptyStringProperty(schemaData.format, 'format'),
    ...getNonEmptyStringProperty(schemaData.defaultValue, 'default'),
    ...getNumberProperty(schemaData.minLength, 'minLength'),
    ...getNumberProperty(schemaData.maxLength, 'maxLength'),
    type: 'string',
});

const getPropertyReferencingObject = (data: IPropertyReferencingASchema, items: IPreprocessedItems): SchemaObject =>
    // Element is required to have exactly 1 schema item inserted
    getApiSpecificationGenerator().resolveSchemaObjectsInLinkedItems(data.schema, items)[0];

interface ISchemaObjectCommonElements {
    readonly description?: string,
    readonly example?: string,
}

const getSchemaCommonElements = (
    schemaData: ISchemaElements,
    items: IPreprocessedItems,
    contentType: string = '',
): ISchemaObjectCommonElements => {
    // Schema: Object and Schema: AllOf's example elements have to be saved as JSON objects
    const example = (contentType === 'object' || contentType === 'allOf')
        ? getNonEmptyStringAsObjectProperty(schemaData.example, 'example')
        : getNonEmptyStringProperty(schemaData.example, 'example');

    return {
        ...getDescriptionProperty(schemaData.description, 'description', items),
        ...example,
    };
};

interface ISchemaObjectBooleanElements {
    readonly nullable?: boolean,
    readonly readOnly?: boolean,
    readonly writeOnly?: boolean,
}

const getSchemaObjectPropertyElements = (schemaData: ISchemaObjectPropertyElements): ISchemaObjectBooleanElements => ({
    ...getBooleanProperty(schemaData.nullable, 'nullable'),
    ...getBooleanProperty(schemaData.readonly, 'readOnly'),
    ...getBooleanProperty(schemaData.writeonly, 'writeOnly'),
});

export const resolveDiscriminatorObject = (field: string, items: IPreprocessedItems): DiscriminatorObject => {
    const discriminatorInfo = getChildrenInfosFromRichText(field);

    if (discriminatorInfo.length === 1) {
        const codename = discriminatorInfo[0].codename;
        const discriminatorData = getItemData<IDiscriminator>(codename, items);

        return {
            mapping: resolveDiscriminatorMapItemObject(discriminatorData.mapping, items),
            propertyName: discriminatorData.propertyName,
        };
    }
};

interface IMapItemObjects {
    [key: string]: string
}

const resolveDiscriminatorMapItemObject = (field: string, items: IPreprocessedItems): IMapItemObjects => {
    const discriminatorMapInfos = getChildrenInfosFromRichText(field);
    const mapItemObjects = {};

    for (const info of discriminatorMapInfos) {
        const codename = info.codename;
        const discriminatorMapItemData = getItemData<IDiscriminatorMapItem>(codename, items);

        const value = discriminatorMapItemData.discriminatorValue;
        mapItemObjects[value] = getApiSpecificationGenerator()
            .resolveSchemaObjectsInLinkedItems(discriminatorMapItemData.schema, items)[0].$ref;
    }

    return mapItemObjects;
};
