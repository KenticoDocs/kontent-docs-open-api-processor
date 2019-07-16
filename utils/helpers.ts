const parser = require('node-html-parser');

export const isNonEmptyString = (str: string): boolean =>
    str && str.length > 0;

export const getItemData = <DataObject>(codename: string, items: unknown): DataObject =>
    items[codename];

export const getChildCodenamesFromRichText = (content: string): string[] => {
    const root = parser.parse(content);
    const objectElements = root.querySelectorAll('object');

    const linkedItemCodenames = getInnerItemCodenames(objectElements, 'link');
    const componentCodenames = getInnerItemCodenames(objectElements, 'component');

    return linkedItemCodenames.concat(componentCodenames);
};

const getInnerItemCodenames = (elements: HTMLElement[], type: string): string[] =>
    elements
        .filter((objectElement: any) =>
            objectElement.rawAttributes.type === 'application/kenticocloud' &&
            objectElement.rawAttributes['data-type'] === 'item' &&
            objectElement.rawAttributes['data-rel'] === type)
        .map((objectElement: any) => objectElement.rawAttributes['data-codename']);
