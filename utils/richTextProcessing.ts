import {
    ICallout,
    ICodeSample,
    ICodeSamples,
    IPreprocessedItems,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    convertToCommonMark,
    resolveChildrenAndCodeBlocks,
} from './commonMarkProcessing';
import {
    labelAllChildItems,
    labelChildCallouts,
    labelChildren,
} from './descriptionLabels';

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
