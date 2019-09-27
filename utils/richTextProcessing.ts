import {
    ICallout,
    ICodeSample,
    ICodeSamples,
    IPreprocessedItems,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import { resolveChildrenAndCodeBlocks } from './commonMarkProcessing';
import {
    labelAllChildItems,
    labelChildCallouts,
    labelChildren,
} from './descriptionLabels';

const html2commonmark = require('html2commonmark');

export const processRichTextWithChildren = (richTextField: string, items: IPreprocessedItems): string => {
    const richTextWithLabelledChildren = labelChildren<ICallout | ICodeSamples | ICodeSample>(
        labelAllChildItems)(richTextField, items);
    const commonMarkText = convertToCommonMark(richTextWithLabelledChildren);

    return resolveChildrenAndCodeBlocks(commonMarkText, items);
};

export const processRichTextWithOnlyCallouts = (richTextField: string, items: IPreprocessedItems): string => {
    const richTextWithLabelledChildren = labelChildren<ICallout>(
        labelChildCallouts)(richTextField, items);
    const commonMarkText = convertToCommonMark(richTextWithLabelledChildren);

    return resolveChildrenAndCodeBlocks(commonMarkText, items);
};

const convertToCommonMark = (html: string): string => {
    const converter = new html2commonmark.JSDomConverter();
    const renderer = new html2commonmark.Renderer();
    const abstractSyntaxTree = converter.convert(html);

    return renderer.render(abstractSyntaxTree);
};
