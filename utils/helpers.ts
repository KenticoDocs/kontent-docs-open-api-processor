import { ReferenceObject } from '@loopback/openapi-v3-types';
import { IPreprocessedItems } from 'kontent-docs-shared-code';

const striptags = require('striptags');

// Used with regular Rich Text elements
export const isNonEmptyDescriptionElement = (text: string): boolean => {
    const textWithoutTags = striptags(text).trim();

    return textWithoutTags && textWithoutTags.length > 0;
};

// Used with Text elements + Rich Text elements that serve as containers for components/linked items
export const isNonEmptyTextOrRichTextLinksElement = (text: string): boolean => {
    if (!text) {
        return false;
    }
    const trimmedText = text.trim();

    return trimmedText && trimmedText.length > 0 && trimmedText !== '<p><br></p>';
};

export function getItemData<DataObject>(codename: string, items: IPreprocessedItems): DataObject  {
    const item = items[codename] as any as DataObject | undefined;

    if (item) {
        return item;
    }

    throw Error(`Could not get item data for codename '${codename}'`);
}

export const getReferenceObject = (container: string, name: string): ReferenceObject => ({
    $ref: `#/components/${container}/${name}`,
});
