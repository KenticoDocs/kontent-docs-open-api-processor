import {
    ICallout,
    ICodeSample,
    IPreprocessedItems,
} from 'kontent-docs-shared-code';
import { ISchemas } from '../generate/getSchemaObjects';
import {
    getItemData,
    getReferenceObject,
    isNonEmptyTextOrRichTextLinksElement,
} from './helpers';

const html2commonmark = require('html2commonmark');

// <h1> heading gets translated in commonMark to ===, which has to be replaced with #
export const fixPrimaryHeadings = (content: string): string => {
    const mainHeadingExtractor = new RegExp('([A-Za-z0-9_ .;&]*)\\n===\\n', 'g');
    let match = mainHeadingExtractor.exec(content);

    let resolvedContent = content;
    while (match && match[1]) {
        const heading = match[1];
        resolvedContent = resolvedContent.replace(`${heading}\n===`, `# ${heading}\n`);

        match = mainHeadingExtractor.exec(content);
    }

    return resolvedContent;
};

export const convertToCommonMark = (html: string, items: IPreprocessedItems): string => {
    const converter = new html2commonmark.JSDomConverter();
    const renderer = new html2commonmark.Renderer();
    const abstractSyntaxTree = converter.convert(html);
    const commonMarkText = renderer.render(abstractSyntaxTree);

    const sanizedCommonMark = sanitizeCommonMark(commonMarkText);

    return resolveChildrenAndCodeBlocks(sanizedCommonMark, items);
};

const sanitizeCommonMark = (content: string): string =>
    content
        .replace(/\\>/g, '>')
        .replace(/\\</g, '<')
        .replace(/\\\[/g, '[')
        .replace(/\\]/g, ']')
        .replace(/\\&/g, '&')
        .replace(/\\\./g, '.')
        .replace(/\\_/g, '_');

export const resolveChildrenAndCodeBlocks = (content: string, items: IPreprocessedItems): string => {
    const contentWithFixedHeadings = fixSecondaryHeading(content);
    const contentWithChildrenContent = insertChildrenIntoCommonMark(contentWithFixedHeadings, items);
    const contentWithResolvedCodeWithinTables = resolveCodeTagsInTables(contentWithChildrenContent);

    return contentWithResolvedCodeWithinTables
        .replace(/({~)/g, '`')
        .replace(/(~})/g, '`');
};

// <h2> heading gets translated in commonMark to ---, which has to be replaced with ##
const fixSecondaryHeading = (content: string): string => {
    const mainHeadingExtractor = new RegExp('(|\\n)([A-Za-z0-9_ .;&]*)\\n---\\n', 'g');
    let match = mainHeadingExtractor.exec(content);

    let resolvedContent = content;
    while (match && match[2]) {
        const heading = match[2];
        resolvedContent = resolvedContent.replace(`${heading}\n---`, `## ${heading}\n`);

        match = mainHeadingExtractor.exec(content);
    }

    return resolvedContent;
};

const insertChildrenIntoCommonMark = (content: string, items: IPreprocessedItems): string => {
    const codenamesExtractor = new RegExp('(<!--codename=([a-z0-9_]*)-->)', 'g');
    let match = codenamesExtractor.exec(content);

    let resolvedContent = content;
    while (match && match[2]) {
        const codename = match[2];
        const childMarkToReplace = `<!--codename=${codename}-->`;

        const childData = getItemData<ICodeSample | ICallout | ISchemas>(codename, items);

        if (!childData) {
            throw Error(`Invalid child data for codename '${codename}'`);
        }

        switch (childData.contentType) {
            case 'callout': {
                const calloutContent = getCalloutContent(childData as ICallout);
                resolvedContent = resolvedContent.replace(childMarkToReplace, calloutContent);
                break;
            }

            case 'code_sample': {
                const codeBlock = getCodeBlock(childData as ICodeSample);
                resolvedContent = resolvedContent.replace(childMarkToReplace, codeBlock);
                break;
            }

            case 'zapi_schema__object':
            case 'zapi_schema__string':
            case 'zapi_schema__number':
            case 'zapi_schema__array':
            case 'zapi_schema__integer':
            case 'zapi_schema__boolean': {
                const schemaDefinition = getSchemaDefinition(childData as ISchemas, codename);
                resolvedContent = resolvedContent.replace(childMarkToReplace, schemaDefinition);
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

const getCalloutContent = (childData: ICallout): string =>
    childData.content
        .replace(/({~)/g, '<code>')
        .replace(/(~})/g, '<\/code>');

const getCodeBlock = (codeSampleData: ICodeSample): string => {
    const code = codeSampleData.code;
    const syntaxHighlighter = getSyntaxHighlighter(codeSampleData.programmingLanguage);

    return `\n\`\`\`${syntaxHighlighter}\n${code}\n\`\`\``;
};

const getSchemaDefinition = (childData: ISchemas, codename: string): string => {
    const name = (childData as ISchemas).name;
    const identifier = isNonEmptyTextOrRichTextLinksElement(name)
        ? name
        : codename;
    const schemaReference = getReferenceObject('schemas', identifier).$ref;

    return `<SchemaDefinition schemaRef="${schemaReference}" ` +
        'showReadOnly={true} showWriteOnly={true} ' +
        `\/> `;
};

const resolveCodeTagsInTables = (content: string): string => {
    const tableContentExtractor = new RegExp('<table>(\n|.)*?</table>', 'g');

    let tableMatch = tableContentExtractor.exec(content);
    let resolvedContent = content;
    while (tableMatch && tableMatch[0]) {
        const tableContent = tableMatch[0];
        const tableContentResolved = tableContent
            .replace(/({~)/g, '<code>')
            .replace(/(~})/g, '</code>');

        resolvedContent = resolvedContent.replace(tableContent, tableContentResolved);

        tableMatch = tableContentExtractor.exec(content);
    }

    return resolvedContent;
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
