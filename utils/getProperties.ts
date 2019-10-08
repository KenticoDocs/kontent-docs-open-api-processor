import {
    DiscriminatorObject,
    HeadersObject,
    SchemaObject,
} from '@loopback/openapi-v3-types';
import { IPreprocessedItems } from 'cloud-docs-shared-code';
import { sendNotification } from '../external/sendNotification';
import {
    ISchemasObject,
    resolveDiscriminatorObject,
} from '../generate/getSchemaObjects';
import {
    isNonEmptyDescriptionElement,
    isNonEmptyTextOrRichTextLinksElement,
} from './helpers';
import { processRichTextWithOnlyCallouts } from './richTextProcessing';

type ConditionFunction<ElementType> = (element: ElementType) => boolean;
type InsertionFunction<ElementType, ToInsert> = (element: ElementType) => ToInsert;

export const getGenericProperty = <ElementType, ToInsert>(
    condition: ConditionFunction<ElementType>,
    insertion: InsertionFunction<ElementType, ToInsert>,
) =>
    (element: ElementType, propertyName: string): object =>
        condition(element)
            ? { [propertyName]: insertion(element) }
            : {};

export interface IObjectWithProperty {
    [key: string]: string,
}

export const getNonEmptyStringAsObjectProperty = (element: string, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string, object>(
        isNonEmptyDescriptionElement,
        (value) => {
            try {
                return JSON.parse(value);
            } catch (exception) {
                sendNotification('', `Invalid JSON object in ${propertyName} element: ${value}`);
            }
        },
    )(element, propertyName);

export const getNonEmptyStringProperty = (element: string, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string, string>(
        isNonEmptyTextOrRichTextLinksElement,
        (value) => value,
    )(element, propertyName);

export const getDescriptionProperty = (
    element: string,
    propertyName: string,
    items: IPreprocessedItems,
): IObjectWithProperty | {} =>
    getGenericProperty<string, string>(
        isNonEmptyDescriptionElement,
        (x) => processRichTextWithOnlyCallouts(x, items),
    )(element, propertyName);

export const getMultipleChoiceProperty = (element: string[], propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string[], string>(
        (x) => x.length === 1,
        (x) => x[0],
    )(element, propertyName);

export const getBooleanProperty = (element: string[], propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string[], boolean>(
        (x) => x.length === 1,
        (x) => x[0] === 'true',
    )(element, propertyName);

export const getArrayPropertyFromString = (element: string, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string, string[]>(
        isNonEmptyTextOrRichTextLinksElement,
        (x) => x.split(','),
    )(element, propertyName);

export const getNumberProperty = (element: number, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<number, number>(
        (x) => x !== null,
        (x) => x,
    )(element, propertyName);

export const getNumberPropertyFromString = (element: string, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string, number>(
        isNonEmptyTextOrRichTextLinksElement,
        (value) => parseInt(value, 10),
    )(element, propertyName);

export const getHeadersProperty = (element: HeadersObject, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<HeadersObject, HeadersObject>(
        (headersObject) => Object.keys(headersObject).length > 0,
        (headersObject) => headersObject,
    )(element, propertyName);

export const getDiscriminatorProperty = (
    field: string,
    propertyName: string,
    items: IPreprocessedItems,
): DiscriminatorObject | {} =>
    getGenericProperty<string, DiscriminatorObject>(
        isNonEmptyTextOrRichTextLinksElement,
        (x) => resolveDiscriminatorObject(x, items),
    )(field, propertyName);

export const getSchemaProperty = (element: SchemaObject[], propertyName: string): ISchemasObject | SchemaObject[] => {
    // AllOf and oneOf schemas will always contain an array of schemas without identifiers
    if (propertyName === 'allOf' || propertyName === 'oneOf') {
        const schemaObject = removeIdentifiersFromSchemasArray(element);

        return { [propertyName]: schemaObject };
    }

    // SchemaObject's additionalProperties should not contain identifiers
    if (propertyName === 'additionalProperties' && element.length > 1) {
        return getAdditionalPropertiesProperty(propertyName, element);
    }

    switch (Object.keys(element).length) {
        case 0: {
            return {};
        }
        case 1: {
            // Schema object's properties attribute needs identifiers
            if (propertyName === 'properties') {
                return { [propertyName]: element[Object.keys(element)[0]] };
            } else {
                const schemaObject = removeIdentifiersFromSchemasArray(element);

                return { [propertyName]: schemaObject[0] };
            }
        }
        default: {
            return { [propertyName]: getISchemasObject(element) };
        }
    }
};

const getAdditionalPropertiesProperty = (
    propertyName: string,
    element: SchemaObject[],
): ISchemasObject | SchemaObject[] => {
    const additionalPropertiesObject = {
        [propertyName]: {},
    };

    element.forEach((item) => {
        const itemKey = Object.keys(item)[0];
        if (itemKey === 'x-additionalPropertiesName') {
            // preserve nesting
            additionalPropertiesObject[propertyName][itemKey] = item[itemKey];
        } else if (itemKey === '$ref') {
            // preserve nesting
            additionalPropertiesObject[propertyName][itemKey] = item[itemKey];
        } else {
            // reduce nesting - omit itemKey
            const validKey = Object.keys(item[itemKey])[0];
            additionalPropertiesObject[propertyName][validKey] = item[itemKey][validKey];
        }
    });

    return additionalPropertiesObject;
};

const removeIdentifiersFromSchemasArray = (element: SchemaObject[]): SchemaObject[] => {
    const schemas = [];
    element.forEach((schemaObject) => {
        const identifier = Object.keys(schemaObject)[0];

        if (identifier === '$ref') {
            schemas.push(schemaObject);
        } else {
            schemas.push(schemaObject[identifier]);
        }
    });

    return schemas;
};

// Transforms an array of schemas into an object with properties
const getISchemasObject = (element: SchemaObject[]): ISchemasObject => {
    const schemas = {};

    element.forEach((schemaObject) => {
        const identifier = Object.keys(schemaObject)[0];
        schemas[identifier] = schemaObject[identifier];
    });

    return schemas;
};
