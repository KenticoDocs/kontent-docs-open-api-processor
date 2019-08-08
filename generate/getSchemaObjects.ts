import {
    DiscriminatorObject,
    SchemaObject,
} from '@loopback/openapi-v3-types';
import {
    IDiscriminator,
    IDiscriminatorMapItem,
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
    getNonEmptyStringProperty,
    getNumberProperty,
    getSchemaProperty,
} from '../utils/getProperties';
import {
    getChildInfosFromRichText,
    getItemData,
} from '../utils/helpers';
import {
    resolveSchemaObjectsInLinkedItems,
    resolveSchemaObjectsInRichTextElement,
} from './generateApiSpecification';

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

export const getSchemaObject = (schemaData: ISchemas, items: unknown): SchemaObject => {
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

const getSchemaAllOfObject = (schemaData: ISchemaAllOf, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaProperty(resolveSchemaObjectsInRichTextElement(schemaData.schemas, items), 'allOf'),
});

const getSchemaAnyOfObject = (schemaData: ISchemaAnyOf, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getSchemaProperty(resolveSchemaObjectsInLinkedItems(schemaData.schemas, items), 'anyOf'),
});

const getSchemaArrayObject = (schemaData: ISchemaArray, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaProperty(resolveSchemaObjectsInRichTextElement(schemaData.items, items), 'items'),
    ...getBooleanProperty(schemaData.uniqueItems, 'uniqueItems'),
    type: 'array',
});

const getSchemaBooleanObject = (schemaData: ISchemaBoolean, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    type: 'boolean',
});

const getSchemaIntegerObject = (schemaData: ISchemaInteger, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getArrayPropertyFromString(schemaData.acceptedValues, 'enum'),
    ...getMultipleChoiceProperty(schemaData.format, 'format'),
    ...getNumberProperty(schemaData.defaultValue, 'default'),
    ...getNumberProperty(schemaData.minimum, 'minimum'),
    ...getNumberProperty(schemaData.maximum, 'maximum'),
    type: 'integer',
});

const getSchemaNumberObject = (schemaData: ISchemaNumber, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getArrayPropertyFromString(schemaData.acceptedValues, 'enum'),
    ...getMultipleChoiceProperty(schemaData.format, 'format'),
    ...getNumberProperty(schemaData.minimum, 'minimum'),
    ...getNumberProperty(schemaData.maximum, 'maximum'),
    type: 'number',
});

const getSchemaObjectObject = (schemaData: ISchemaObject, items: unknown): SchemaObject => {
    const properties = resolveSchemaObjectsInRichTextElement(schemaData.properties, items);
    const additionalProperties = resolveSchemaObjectsInRichTextElement(schemaData.additionalProperties, items);

    return {
        ...getSchemaCommonElements(schemaData, items),
        ...getArrayPropertyFromString(schemaData.required, 'required'),
        ...getSchemaProperty(properties, 'properties'),
        ...getSchemaProperty(additionalProperties, 'additionalProperties'),
        type: 'object',
    };
};

const getSchemaOneOfObject = (schemaData: ISchemaOneOf, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getDiscriminatorProperty(schemaData.discriminator, 'discriminator', items),
    ...getSchemaProperty(resolveSchemaObjectsInLinkedItems(schemaData.schemas, items), 'oneOf'),
});

const getSchemaStringObject = (schemaData: ISchemaString, items: unknown): SchemaObject => ({
    ...getSchemaCommonElements(schemaData, items),
    ...getSchemaObjectPropertyElements(schemaData),
    ...getArrayPropertyFromString(schemaData.acceptedValues, 'enum'),
    ...getNonEmptyStringProperty(schemaData.format, 'format'),
    ...getNonEmptyStringProperty(schemaData.defaultValue, 'default'),
    ...getNumberProperty(schemaData.minLength, 'minLength'),
    ...getNumberProperty(schemaData.maxLength, 'maxLength'),
    type: 'string',
});

const getPropertyReferencingObject = (data: IPropertyReferencingASchema, items: unknown): SchemaObject =>
    // Element is required to have exactly 1 schema item inserted
    resolveSchemaObjectsInLinkedItems(data.schema, items)[0];

interface ISchemaObjectCommonElements {
    readonly description?: string,
    readonly example?: string,
}

const getSchemaCommonElements = (schemaData: ISchemaElements, items: unknown): ISchemaObjectCommonElements => ({
    ...getDescriptionProperty(schemaData.description, 'description', items),
    ...getNonEmptyStringProperty(schemaData.example, 'example'),
});

interface ISchemaObjectBooleanElements {
    readonly nullable?: boolean,
    readonly readOnly?: boolean,
    readonly writeOnly?: boolean,
}

const getSchemaObjectPropertyElements = (schemaData: ISchemaObjectPropertyElements): ISchemaObjectBooleanElements => ({
    ...getBooleanProperty(schemaData.nullable, 'nullable'),
    ...getBooleanProperty(schemaData.readonly, 'readonly'),
    ...getBooleanProperty(schemaData.writeonly, 'writeonly'),
});

export const resolveDiscriminatorObject = (field: string, items: unknown): DiscriminatorObject => {
    const discriminatorInfo = getChildInfosFromRichText(field);

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

const resolveDiscriminatorMapItemObject = (field: string, items: unknown): IMapItemObjects => {
    const discriminatorMapInfos = getChildInfosFromRichText(field);
    const mapItemObjects = {};

    for (const info of discriminatorMapInfos) {
        const codename = info.codename;
        const discriminatorMapItemData = getItemData<IDiscriminatorMapItem>(codename, items);

        const value = discriminatorMapItemData.discriminatorValue;
        mapItemObjects[value] = resolveSchemaObjectsInLinkedItems(discriminatorMapItemData.schema, items)[0];
    }

    return mapItemObjects;
};
