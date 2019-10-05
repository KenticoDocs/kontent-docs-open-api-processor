import { ICallout } from 'cloud-docs-shared-code';
import {
    CalloutMarkEnd,
    CodeSampleMarkEnd,
    CodeSamplesMarkEnd,
    CodeSamplesMarkStart,
    getChildCodenamesFromRichText,
    getChildrenInfosFromRichText,
    getLabelledCallout,
    getLabelledCodeSample,
    getLabelledCodeSamples,
    labelAllChildItems,
    labelChildCallouts,
    labelChildren,
} from './richTextProcessing';

describe('labelChildren', () => {
    const items = {
        callout_item: {
            content: '<p>Callout content</p>',
            contentType: 'callout',
            id: 'callout_item',
            type: [
                'Tip',
            ],
        },
        code_sample_item: {
            code: 'code sample code',
            contentType: 'code_sample',
            id: '6d9f708d-8500-0159-ac96-a72fc7e5c8a0',
            platform: [],
            programmingLanguage: [
                'JSON',
            ],
        },
        code_samples_item: {
            codeSamples: [],
            contentType: 'code_samples',
            id: '6d9f708d-8500-0159-ac96-a72fc7e5c8a0',
        },
        n270aa43a_0910_0193_cac2_00a2dc564224: {
            content: '<p>Another Callout content</p>',
            contentType: 'callout',
            id: 'n270aa43a_0910_0193_cac2_00a2dc564224',
            type: [
                'Warning',
            ],
        },
    };

    const firstCalloutCodename = 'callout_item';
    const secondCalloutCodename = 'n270aa43a_0910_0193_cac2_00a2dc564224';
    const codeSampleCodename = 'code_sample_item';
    const codeSamplesCodename = 'code_samples_item';

    const richTextContent = '<p ' +
        'type="application/kenticocloud" ' +
        'data-type="item" ' +
        'data-rel="link" ' +
        `data-codename="${codeSamplesCodename}">` +
        '</p>\n' +
        '<p ' +
        'type="application/kenticocloud" ' +
        'data-type="item" ' +
        'data-rel="component" ' +
        `data-codename="${firstCalloutCodename}">` +
        '</p>\n' +
        '<p><br></p>' +
        '<p ' +
        'type="application/kenticocloud" ' +
        'data-type="item" ' +
        'data-rel="link" ' +
        `data-codename="${codeSampleCodename}">` +
        '</p>' +
        '<p ' +
        'type="application/kenticocloud" ' +
        'data-type="item" ' +
        'data-rel="component" ' +
        `data-codename="${secondCalloutCodename}">` +
        '</p>\n';

    it('labels callouts correctly using labelChildCallouts function', () => {
        const expectedOutput =
            '<p ' +
            'type="application/kenticocloud" ' +
            'data-type="item" ' +
            'data-rel="link" ' +
            'data-codename="code_samples_item">' +
            '</p>\n' +
            `<!--Callout type=${items[firstCalloutCodename].type}-->` +
            `<!--codename=${firstCalloutCodename}-->` +
            `${CalloutMarkEnd}\n` +
            '<p><br></p>' +
            '<p ' +
            'type="application/kenticocloud" ' +
            'data-type="item" ' +
            'data-rel="link" ' +
            'data-codename="code_sample_item">' +
            '</p>' +
            `<!--Callout type=${items[secondCalloutCodename].type}-->` +
            `<!--codename=${secondCalloutCodename}-->` +
            `${CalloutMarkEnd}\n`;

        const actualOutput = labelChildren<ICallout>(labelChildCallouts)(richTextContent, items);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('labels all children correctly using labelAllChildItems function', () => {
        const codeSampleItem = items.code_sample_item;
        const expectedOutput =
            `${CodeSamplesMarkStart}${CodeSamplesMarkEnd}\n` +
            `<!--Callout type=${items[firstCalloutCodename].type}-->` +
            `<!--codename=${firstCalloutCodename}-->` +
            `${CalloutMarkEnd}\n` +
            '<p><br></p>' +
            `<!--CodeSample programmingLanguage=${codeSampleItem.programmingLanguage[0]} platform=-->` +
            `<!--codename=${codeSampleCodename}-->` +
            `${CodeSampleMarkEnd}` +
            `<!--Callout type=${items[secondCalloutCodename].type}-->` +
            `<!--codename=${secondCalloutCodename}-->` +
            `${CalloutMarkEnd}\n`;

        const actualOutput = labelChildren<ICallout>(labelAllChildItems)(richTextContent, items);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

describe('getLabelledCallout', () => {
    it('correctly labels a Callout', () => {
        const codename = 'premium_feature';
        const type = 'warning';
        const expectedOutput =
            `<!--Callout type=${type}-->` +
            `<!--codename=${codename}-->` +
            `${CalloutMarkEnd}`;

        const actualOutput = getLabelledCallout(codename, type);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

describe('getLabelledCodeSample', () => {
    const codename = 'get_items';

    it('correctly labels code sample with 1 platform and 1 programming language', () => {
        const programmingLanguage = ['HTML'];
        const platform = ['React'];
        const expectedOutput =
            `<!--CodeSample programmingLanguage=${programmingLanguage[0]} platform=${platform[0]}-->` +
            `<!--codename=${codename}-->` +
            `${CodeSampleMarkEnd}`;

        const actualOutput = getLabelledCodeSample(codename, programmingLanguage, platform);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('correctly labels code sample with no platforms or programming languages', () => {
        const programmingLanguage = [];
        const platform = [];
        const expectedOutput =
            `<!--CodeSample programmingLanguage= platform=-->` +
            `<!--codename=${codename}-->` +
            `${CodeSampleMarkEnd}`;

        const actualOutput = getLabelledCodeSample(codename, programmingLanguage, platform);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('correctly labels code sample with multiple platforms and programming languages', () => {
        const programmingLanguage = ['HTML', 'CSS'];
        const platform = ['React', 'Vue.js'];
        const expectedOutput =
            `<!--CodeSample programmingLanguage=${programmingLanguage[0]},${programmingLanguage[1]} ` +
            `platform=${platform[0]},${platform[1]}-->` +
            `<!--codename=${codename}-->` +
            `${CodeSampleMarkEnd}`;

        const actualOutput = getLabelledCodeSample(codename, programmingLanguage, platform);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

describe('getLabelledCodeSamples', () => {
    const items = {
        add_item: {
            code: 'How to add an item...',
            platform: ['React'],
            programmingLanguage: ['Javascript'],
        },
        update_item: {
            code: 'How to update an item...',
            platform: ['React'],
            programmingLanguage: ['Javascript'],
        },
    };

    it('correctly labels code samples item and all of its linked code sample items', () => {
        const add = items.add_item;
        const update = items.update_item;
        const codenames = [
            'add_item',
            'update_item',
        ];
        const expectedOutput =
            `${CodeSamplesMarkStart}` +
            `<!--CodeSample programmingLanguage=${add.programmingLanguage[0]} platform=${add.platform[0]}-->` +
            `<!--codename=${codenames[0]}-->` +
            `${CodeSampleMarkEnd}` +
            `<!--CodeSample programmingLanguage=${update.programmingLanguage[0]} platform=${update.platform[0]}-->` +
            `<!--codename=${codenames[1]}-->` +
            `${CodeSampleMarkEnd}` +
            `${CodeSamplesMarkEnd}`;

        const actualOutput = getLabelledCodeSamples(codenames, items);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('handles a code samples item without any linked code sample items', () => {
        const codenames = [];
        const expectedOutput = `${CodeSamplesMarkStart}${CodeSamplesMarkEnd}`;

        const actualOutput = getLabelledCodeSamples(codenames, items);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

const richTextWithLinks = '<p ' +
    'type="application/kenticocloud" ' +
    'data-type="item" ' +
    'data-rel="link" ' +
    'data-codename="first_known_item">' +
    '</p>\n' +
    '<p ' +
    'type="application/kenticocloud" ' +
    'data-type="item" ' +
    'data-rel="component" ' +
    'data-codename="n270aa43a_0910_0193_cac2_00a2dc564224">' +
    '</p>\n' +
    '<p><br></p>' +
    '<p ' +
    'type="application/kenticocloud" ' +
    'data-type="item" ' +
    'data-rel="link" ' +
    'data-codename="second_known_item">' +
    '</p>';

const childlessRichTextContent = '<p>Some text.</p>';

describe('getChildCodenamesFromRichText', () => {
    it('returns codenames of children from rich text element', () => {
        const expectedOutput = [
            'first_known_item',
            'n270aa43a_0910_0193_cac2_00a2dc564224',
            'second_known_item',
        ];

        const actualOutput = getChildCodenamesFromRichText(richTextWithLinks);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('returns an empty array for 0 child items in rich text element', () => {
        const expectedOutput = [];

        const actualOutput = getChildCodenamesFromRichText(childlessRichTextContent);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

describe('getChildrenInfosFromRichText', () => {
    it('returns correct information about children from rich text element', () => {
        const expectedOutput = [{
            codename: 'first_known_item',
            isItem: true,
        }, {
            codename: 'n270aa43a_0910_0193_cac2_00a2dc564224',
            isItem: false,
        }, {
            codename: 'second_known_item',
            isItem: true,
        }];

        const actualOutput = getChildrenInfosFromRichText(richTextWithLinks);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('returns an empty array for 0 child items in rich text element', () => {
        const expectedOutput = [];

        const actualOutput = getChildrenInfosFromRichText(childlessRichTextContent);

        expect(actualOutput).toEqual(expectedOutput);
    });
});
