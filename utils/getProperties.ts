import {
    DiscriminatorObject,
    HeadersObject,
    SchemaObject,
} from '@loopback/openapi-v3-types';
import { IPreprocessedItems } from 'cloud-docs-shared-code';
import {
    ISchemasObject,
    resolveDiscriminatorObject,
} from '../generate/getSchemaObjects';
import {
    isNonEmptyDescription,
    isNonEmptyTextOrRichTextLinks,
} from './helpers';
import { processRichTextWithOnlyCallouts } from './richTextProcessing';

type ConditionFunction<ElementType> = (element: ElementType) => boolean;
type InsertionFunction<ElementType, ToInsert> = (element: ElementType) => ToInsert;

export const getGenericProperty = <ElementType, ToInsert>(
    condition: ConditionFunction<ElementType>,
    insertion: InsertionFunction<ElementType, ToInsert>,
) =>
    (element: ElementType, propertyName: string): object => ({
        ...(condition(element))
            ? { [propertyName]: insertion(element) }
            : {},
    });

interface IObjectWithProperty {
    [key: string]: string,
}

export const getNonEmptyStringProperty = (element: string, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string, string>(
        isNonEmptyTextOrRichTextLinks,
        (value) => value,
    )(element, propertyName);

export const getDescriptionProperty = (
    element: string,
    propertyName: string,
    items: IPreprocessedItems,
): IObjectWithProperty | {} =>
    getGenericProperty<string, string>(
        isNonEmptyDescription,
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
        isNonEmptyTextOrRichTextLinks,
        (x) => x.split(','),
    )(element, propertyName);

export const getNumberProperty = (element: number, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<number, number>(
        (x) => x !== null,
        (x) => x,
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
        isNonEmptyTextOrRichTextLinks,
        (x) => resolveDiscriminatorObject(x, items),
    )(field, propertyName);

export const getSchemaProperty = (element: SchemaObject[], propertyName: string): ISchemasObject | SchemaObject[] => {
    // AllOf and oneOf schemas will always contain an array of schemas without identifiers
    if (propertyName === 'allOf' || propertyName === 'oneOf') {
        const schemaObject = removeIdentifiersFromSchemasArray(element);

        return { [propertyName]: schemaObject };
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
