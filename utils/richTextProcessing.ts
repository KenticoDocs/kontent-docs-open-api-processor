import {
    ICallout,
    ICodeSample,
    ICodeSamples,
    IPreprocessedItems,
} from 'cloud-docs-shared-code/reference/preprocessedModels';
import {
    labelAllChildItems,
    labelChildCallouts,
    labelChildren,
} from './descriptionLabels';
import {
    getItemData,
    isNonEmptyTextOrRichTextLinksElement,
} from './helpers';

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

export const resolveChildrenAndCodeBlocks = (content: string, items: IPreprocessedItems): string => {
    const contentWithChildrenContent = insertChildrenIntoCommonMark(content, items);

    return contentWithChildrenContent
        .replace(/({~)/g, '`')
        .replace(/(~})/g, '`');
};

const insertChildrenIntoCommonMark = (content: string, items: IPreprocessedItems): string => {
    const codenamesExtractor = new RegExp('(<!--codename=([a-z0-9_]*)-->)', 'g');
    let match = codenamesExtractor.exec(content);

    let resolvedContent = content;
    while (match && match[2]) {
        const codename = match[2];
        const childMarkToReplace = `<!--codename=${codename}-->`;

        const childData = getItemData<ICodeSample | ICallout>(codename, items);
        switch (childData.contentType) {
            case 'callout': {
                resolvedContent = resolvedContent.replace(childMarkToReplace, (childData as ICallout).content);
                break;
            }
            case 'code_sample': {
                const codeBlock = getCodeBlock(childData as ICodeSample);
                resolvedContent = resolvedContent.replace(childMarkToReplace, codeBlock);
                break;
            }
            default: {
                throw Error(`Invalid child of type ${childData.contentType} inside description element.`);
            }
        }

        match = codenamesExtractor.exec(content);
    }

    return resolvedContent;
};

const getCodeBlock = (codeSampleData: ICodeSample): string => {
    const code = codeSampleData.code;
    const syntaxHighlighter = getSyntaxHighlighter(codeSampleData.programmingLanguage);

    return `\n\`\`\`${syntaxHighlighter}\n${code}\n\`\`\``;
};

const getSyntaxHighlighter = (programmingLanguages: string[]): string => {
    const language = programmingLanguages.length > 0
        ? programmingLanguages[0]
        : '';

    switch (language) {
        case 'C#': {
            return 'csharp';
        }
        case 'CSS':
        case 'cURL':
        case 'shell': {
            return '';
        }
        default: {
            return isNonEmptyTextOrRichTextLinksElement(language)
                ? language.toLowerCase()
                : '';
        }
    }
};
