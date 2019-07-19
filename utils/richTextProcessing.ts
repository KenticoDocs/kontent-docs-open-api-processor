import {
    ICallout,
    ICodeSample,
    ICodeSamples,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    getLabelledCallout,
    getLabelledCodeSample,
    getLabelledCodeSamples,
} from './descriptionLabels';
import { getItemData } from './helpers';

const html2commonmark = require('html2commonmark');
const parser = require('node-html-parser');

export const processRichTextWithComponents = (richTextField: string, items: unknown) => {
    const richTextWithLabelledChildren = labelChildren<ICallout | ICodeSamples | ICodeSample>(
        labelAnyChildItems)(richTextField, items);

    return convertToCommonMark(richTextWithLabelledChildren);
};

export const processRichTextWithCallouts = (richTextField: string, items: unknown) => {
    const richTextWithLabelledChildren = labelChildren<ICallout>(
        labelChildCallouts)(richTextField, items);

    return convertToCommonMark(richTextWithLabelledChildren);
};

const convertToCommonMark = (html: string): string => {
    const converter = new html2commonmark.JSDomConverter();
    const renderer = new html2commonmark.Renderer();

    const abstractSyntaxTree = converter.convert(html);

    return renderer.render(abstractSyntaxTree);
};

interface IChildElementData {
    readonly codename: string;
    readonly element: string;
}

type ILabelFunction<AllowedItems> = (
    item: AllowedItems,
    content: string,
    childElementData: IChildElementData,
    items: unknown,
) => string

const labelChildren = <AllowedItems>(labelFunction: ILabelFunction<AllowedItems>) =>
    (content: string, items: unknown): string => {
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
            const item = getItemData<AllowedItems>(childElementData.codename, items);

            if (item) {
                modifiedContent = labelFunction(item, modifiedContent, childElementData, items);
            }
        });

        return modifiedContent;
    };

const labelAnyChildItems = (
    item: ICallout | ICodeSamples | ICodeSample,
    content: string,
    childElementData: IChildElementData,
    items: unknown,
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
            const { code, programmingLanguage, platform } = item as ICodeSample;
            const labelledContent = getLabelledCodeSample(code, programmingLanguage, platform);

            return content.replace(childElementData.element, labelledContent);
        }
        default: {
            return;
        }
    }
};

const labelChildCallouts = (
    item: ICallout,
    content: string,
    childElementData: IChildElementData,
): string => {
    if (item && item.contentType === 'callout') {
        const callout = item as ICallout;
        const calloutType = callout.type.length === 1 ? callout.type[0] : 'not_specified';
        const labelledContent = getLabelledCallout(callout.content, calloutType);

        return content.replace(childElementData.element, labelledContent);
    }

    return content;
};
