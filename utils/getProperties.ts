import { DiscriminatorObject } from '@loopback/openapi-v3-types';
import { resolveDiscriminatorObject } from '../generate/getSchemaObjects';
import { isNonEmptyString } from './helpers';
import { processRichTextWithCallouts } from './richTextProcessing';

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
        isNonEmptyString,
        (value) => value)
    (element, propertyName);

export const getDescriptionProperty = (
    element: string,
    propertyName: string,
    items: unknown,
): IObjectWithProperty | {} =>
    getGenericProperty<string, string>(
        isNonEmptyString,
        (x) => processRichTextWithCallouts(x, items))
    (element, propertyName);

export const getMultipleChoiceProperty = (element: string[], propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string[], string>(
        (x) => x.length === 1,
        (x) => x[0])
    (element, propertyName);

export const getBooleanProperty = (element: string[], propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string[], boolean>(
        (x) => x.length === 1,
        (x) => x[0] === 'true')
    (element, propertyName);

export const getRequiredProperty = (element: string, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<string, string[]>(
        isNonEmptyString,
        (x) => x.split(','))
    (element, propertyName);

export const getNumberProperty = (element: number, propertyName: string): IObjectWithProperty | {} =>
    getGenericProperty<number, number>(
        (x) => x !== null,
        (x) => x)
    (element, propertyName);

export const getDiscriminatorProperty = (
    field: string,
    propertyName: string,
    items: unknown,
): DiscriminatorObject | {} =>
    getGenericProperty<string, DiscriminatorObject>(
        isNonEmptyString,
        (x) => resolveDiscriminatorObject(x, items))
    (field, propertyName);
