import { ICodeSample } from 'cloud-docs-shared-code/reference/preprocessedModels';
import { getItemData } from './helpers';

const getCalloutMarkStart = (type: string) => `<!--Callout type=${type}-->`;
const CalloutMarkEnd = '<!--Callout-end-->';
const CodeSamplesMarkStart = '<!--CodeSamples-->';
const CodeSamplesMarkEnd = '<!--CodeSamples-end-->';
const getCodeSampleMarkStart = (programmingLanguages: string[], platforms: string[]) => {
    const joinedProgrammingLanguages = programmingLanguages.join();
    const joinedPlatforms = platforms.join();

    return `<!--CodeSample programmingLanguage=${joinedProgrammingLanguages} platform=${joinedPlatforms}-->`;
};
const CodeSampleMarkEnd = '<!--CodeSample-end-->';

export const getLabelledCallout = (content: string, type: string): string =>
    getCalloutMarkStart(type) + content + CalloutMarkEnd;

export const getLabelledCodeSample = (content: string, programmingLanguage: string[], platform: string[]) =>
    getCodeSampleMarkStart(programmingLanguage, platform) + content + CodeSampleMarkEnd;

export const getLabelledCodeSamples = (codeSampleCodenames: string[], items: unknown): string => {
    const content = getLabelledCodeSampleItems(codeSampleCodenames, items);

    return CodeSamplesMarkStart + content + CodeSamplesMarkEnd;
};

const getLabelledCodeSampleItems = (codenames: string[], items: unknown): string => {
    const codeSampleItems = codenames.map((codename) => {
        const { code, programmingLanguage, platform } = getItemData<ICodeSample>(codename, items);

        return getLabelledCodeSample(code, programmingLanguage, platform);
    });

    return codeSampleItems.join('');
};
