import {
    ICallout,
    ICodeSample,
    IPreprocessedItems,
    ISchemaObject,
} from 'cloud-docs-shared-code';
import {
    getItemData,
    getReferenceObject,
    isNonEmptyTextOrRichTextLinksElement,
} from './helpers';

export const resolveChildrenAndCodeBlocks = (content: string, items: IPreprocessedItems): string => {
    const contentWithFixedHeadings = fixSecondaryHeading(content);
    const contentWithChildrenContent = insertChildrenIntoCommonMark(contentWithFixedHeadings, items);

    return contentWithChildrenContent
        .replace(/({~)/g, '`')
        .replace(/(~})/g, '`');
};

// <h2> heading gets translated in commonMark to ---, which has to be replaced with ##
const fixSecondaryHeading = (content: string): string => {
    const mainHeadingExtractor = new RegExp('(|\\n)([A-Za-z0-9_ ]*)\\n---\\n', 'g');
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

        const childData = getItemData<ICodeSample | ICallout | ISchemaObject>(codename, items);
        switch (childData.contentType) {
            case 'callout': {
                const calloutContent = (childData as ICallout).content
                    .replace(/({~)/g, '<code>')
                    .replace(/(~})/g, '<\/code>');
                resolvedContent = resolvedContent.replace(childMarkToReplace, calloutContent);
                break;
            }

            case 'code_sample': {
                const codeBlock = getCodeBlock(childData as ICodeSample);
                resolvedContent = resolvedContent.replace(childMarkToReplace, codeBlock);
                break;
            }

            case 'zapi_schema__object': {
                const name = (childData as ISchemaObject).name;
                const identifier = isNonEmptyTextOrRichTextLinksElement(name)
                    ? name
                    : codename;
                const schemaReference = getReferenceObject('schemas', identifier).$ref;
                const schemaDefinition = `<SchemaDefinition schemaRef="${schemaReference}" ` +
                    'showReadOnly={true} showWriteOnly={true} ' +
                    `\/> `;

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

// <h1> heading gets translated in commonMark to ===, which has to be replaced with #
export const fixPrimaryHeadings = (content: string): string => {
    const mainHeadingExtractor = new RegExp('([A-Za-z0-9_]*)\\n===\\n', 'g');
    let match = mainHeadingExtractor.exec(content);

    let resolvedContent = content;
    while (match && match[1]) {
        const heading = match[1];
        resolvedContent = resolvedContent.replace(`${heading}\n===`, `# ${heading}\n`);

        match = mainHeadingExtractor.exec(content);
    }

    return resolvedContent;
};
