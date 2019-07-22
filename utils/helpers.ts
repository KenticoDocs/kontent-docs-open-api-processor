import { ReferenceObject } from '@loopback/openapi-v3-types';

const parser = require('node-html-parser');

export const isNonEmptyString = (str: string): boolean =>
    str && str.length > 0;

export const getItemData = <DataObject>(codename: string, items: unknown): DataObject =>
    items[codename];

export const getChildCodenamesFromRichText = (content: string): string[] => {
    const root = parser.parse(content);
    const objectElements = root.querySelectorAll('p');

    const linkedItemCodenames = getInnerItemCodenames(objectElements, 'link');
    const componentCodenames = getInnerItemCodenames(objectElements, 'component');

    return linkedItemCodenames.concat(componentCodenames);
};

interface IChildInfo {
    readonly isItem: boolean,
    readonly codename: string,
}

export const getChildInfosFromRichText = (content: string): IChildInfo[] => {
    const root = parser.parse(content);
    const objectElements = root.querySelectorAll('p');

    const linkedItemInfos = getInnerItemCodenames(objectElements, 'link')
        .map((codename) => ({
            codename,
            isItem: true,
        }));
    const componentInfos = getInnerItemCodenames(objectElements, 'component')
        .map((codename) => ({
            codename,
            isItem: false,
        }));

    return linkedItemInfos.concat(componentInfos);
};

const getInnerItemCodenames = (elements: HTMLElement[], type: string): string[] =>
    elements
        .filter((objectElement: any) =>
            objectElement.rawAttributes.type === 'application/kenticocloud' &&
            objectElement.rawAttributes['data-type'] === 'item' &&
            objectElement.rawAttributes['data-rel'] === type)
        .map((objectElement: any) => objectElement.rawAttributes['data-codename']);

export const getReferenceObject = (container: string, name: string): ReferenceObject => ({
    $ref: `#/components/${container}/${name}`,
});

export const addBooleanProperty = (element: string[], propertyName: string, apiObject: object): void => {
    if (element.length === 1) {
        apiObject[propertyName] = element[0] === 'true';
    }
};

export const addNonEmptyStringProperty = (element: string, propertyName: string, apiObject: object): void => {
    if (isNonEmptyString(element)) {
        apiObject[propertyName] = element;
    }
};

export const addMultipleChoiceProperty = (element: string[], propertyName: string, apiObject: object): void => {
    if (element.length === 1) {
        apiObject[propertyName] = element[0];
    }
};
