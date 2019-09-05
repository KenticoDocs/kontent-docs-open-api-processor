import {
    ICallout,
    ICodeSample,
    ICodeSamples,
    IPreprocessedItems,
    ISchemaObject,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    getItemData,
    getReferenceObject,
    isNonEmptyTextOrRichTextLinks,
} from './helpers';

const parser = require('node-html-parser');

interface IChildElementData {
    readonly codename: string;
    readonly element: string;
}

type LabelFunction<AllowedChildren> = (
    item: AllowedChildren,
    content: string,
    childElementData: IChildElementData,
    items: IPreprocessedItems,
) => string;

export const labelChildren = <AllowedChildren>(labelFunction: LabelFunction<AllowedChildren>) =>
    (content: string, items: IPreprocessedItems): string => {
        const root = parser.parse(content);
        const objectElements = root.querySelectorAll('p');

        const childElementsData = objectElements
            .filter((objectElement) =>
                objectElement.rawAttributes.type === 'application/kenticocloud' &&
                objectElement.rawAttributes['data-type'] === 'item' &&
                (objectElement.rawAttributes['data-rel'] === 'component' ||
                    objectElement.rawAttributes['data-rel'] === 'link'))
            .map((element) => ({
                codename: element.rawAttributes['data-codename'],
                element: element.toString(),
            }));

        let modifiedContent = content;

        childElementsData.forEach((childElementData) => {
            const item = getItemData<AllowedChildren>(childElementData.codename, items);

            if (item) {
                modifiedContent = labelFunction(item, modifiedContent, childElementData, items);
            }
        });

        return modifiedContent;
    };

export const labelAllChildItems = (
    item: ICallout | ICodeSamples | ICodeSample | ISchemaObject,
    content: string,
    childElementData: IChildElementData,
    items: IPreprocessedItems,
): string => {
    switch (item.contentType) {
        case 'callout': {
            return labelChildCallouts(item as ICallout, content, childElementData);
        }
        case 'code_samples': {
            const codeSamplesItem = item as ICodeSamples;
            const labelledContent = getLabelledCodeSamples(codeSamplesItem.codeSamples, items);

            return content.replace(childElementData.element, labelledContent);
        }
        case 'code_sample': {
            const { programmingLanguage, platform } = item as ICodeSample;
            const labelledContent = getLabelledCodeSample(childElementData.codename, programmingLanguage, platform);

            return content.replace(childElementData.element, labelledContent);
        }
        case 'zapi_schema__object': {
            const codename = childElementData.codename;
            const schemaData = getItemData<ISchemaObject>(codename, items);
            const identifier = isNonEmptyTextOrRichTextLinks(schemaData.name)
                ? schemaData.name
                : codename;
            const schemaReference = getReferenceObject('schemas', identifier).$ref;
            const schemaDefinition = `<SchemaDefinition schemaRef=${schemaReference} />`;

            return content.replace(childElementData.element, schemaDefinition);
        }
        default: {
            return content;
        }
    }
};

export const labelChildCallouts = (
    item: ICallout,
    content: string,
    childElementData: IChildElementData,
): string => {
    if (item && item.contentType === 'callout') {
        const callout = item as ICallout;
        const calloutType = callout.type.length === 1 ? callout.type[0] : 'not_specified';
        const labelledContent = getLabelledCallout(childElementData.codename, calloutType);

        return content.replace(childElementData.element, labelledContent);
    }

    return content;
};

export const getLabelledCallout = (codename: string, type: string): string =>
    getCalloutMarkStart(type) + getCodenameMark(codename) + CalloutMarkEnd;

export const getLabelledCodeSamples = (codeSampleCodenames: string[], items: IPreprocessedItems): string => {
    const content = getLabelledCodeSampleItems(codeSampleCodenames, items);

    return CodeSamplesMarkStart + content + CodeSamplesMarkEnd;
};

const getLabelledCodeSampleItems = (codenames: string[], items: IPreprocessedItems): string => {
    const codeSampleItems = codenames.map((codename) => {
        const { programmingLanguage, platform } = getItemData<ICodeSample>(codename, items);

        return getLabelledCodeSample(codename, programmingLanguage, platform);
    });

    return codeSampleItems.join('');
};

export const getLabelledCodeSample = (codename: string, programmingLanguage: string[], platform: string[]) =>
    getCodeSampleMarkStart(programmingLanguage, platform) + getCodenameMark(codename) + CodeSampleMarkEnd;

export const getCodenameMark = (codename: string): string => `<!--codename=${codename}-->`;

const getCalloutMarkStart = (type: string) => `<!--Callout type=${type}-->`;
export const CalloutMarkEnd = '<!--Callout-end-->';

const getCodeSampleMarkStart = (programmingLanguages: string[], platforms: string[]) => {
    const joinedProgrammingLanguages = programmingLanguages.join();
    const joinedPlatforms = platforms.join();

    return `<!--CodeSample programmingLanguage=${joinedProgrammingLanguages} platform=${joinedPlatforms}-->`;
};
export const CodeSampleMarkEnd = '<!--CodeSample-end-->';

export const CodeSamplesMarkStart = '<!--CodeSamples-->';
export const CodeSamplesMarkEnd = '<!--CodeSamples-end-->';
