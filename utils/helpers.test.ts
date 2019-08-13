import {
    getChildCodenamesFromRichText,
    getChildInfosFromRichText,
    getItemData,
    getReferenceObject,
    isNonEmptyString,
} from './helpers';

interface ITestingCodeSamples {
    readonly codeSamples: string[],
    readonly contentType: string,
    readonly id: string,
}

const items = {
    n032a464b_e011_01b3_a46e_aa5e40de1985: {
        apiReference: [
            'Recommendation API',
        ],
        contentType: 'zapi_schema__array',
        description: '<p><br></p>',
        id: '032a464b-e011-01b3-a46e-aa5e40de1985',
        items: '<p type=\"application/kenticocloud\" data-type=\"item\" data-rel=\"link\" ' +
            'data-codename=\"recommended_item\" class=\"kc-linked-item-wrapper\"></p>',
    },
    testing_api_samples: {
        codeSamples: [
            'recommendation_api_post_track_portionview_net',
            'recommendation_api_post_track_portionview_rest',
        ],
        contentType: 'code_samples',
        id: 'af8c074e-7ca4-4dda-9e5d-f6153b55f406',
    },
};

const richTextContent = '<p ' +
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

describe('isNonEmptyString', () => {
    it('returns false on null', () => {
        const actualOutput = isNonEmptyString(null);

        expect(actualOutput).toBeFalsy();
    });

    it('returns false on undefined', () => {
        const actualOutput = isNonEmptyString(undefined);

        expect(actualOutput).toBeFalsy();
    });

    it('returns false on whitespace', () => {
        const actualOutput = isNonEmptyString(' ');

        expect(actualOutput).toBeFalsy();
    });

    it('returns false on an empty string', () => {
        const actualOutput = isNonEmptyString('');

        expect(actualOutput).toBeFalsy();
    });

    it('returns true on a valid string', () => {
        const actualOutput = isNonEmptyString('text');

        expect(actualOutput).toBeTruthy();
    });
});

describe('getItemData', () => {
    it('returns item of the specified type', () => {
        const codename = 'testing_api_samples';
        const expectedOutput = items[codename];

        const actualOutput = getItemData<ITestingCodeSamples>(codename, items);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('returns undefined for a not found item', () => {
        const notFoundCodename = 'not_found_item';
        const expectedOutput = undefined;

        const actualOutput = getItemData<ITestingCodeSamples>(notFoundCodename, items);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

describe('getChildCodenamesFromRichText', () => {
    it('returns codenames of children from rich text element', () => {
        const expectedOutput = [
            'first_known_item',
            'second_known_item',
            'n270aa43a_0910_0193_cac2_00a2dc564224',
        ];

        const actualOutput = getChildCodenamesFromRichText(richTextContent);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('returns an empty array for 0 child items in rich text element', () => {
        const expectedOutput = [];

        const actualOutput = getChildCodenamesFromRichText(childlessRichTextContent);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

describe('getChildInfosFromRichText', () => {
    it('returns correct information about children from rich text element', () => {
        const expectedOutput = [{
            codename: 'first_known_item',
            isItem: true,
        }, {
            codename: 'second_known_item',
            isItem: true,
        }, {
            codename: 'n270aa43a_0910_0193_cac2_00a2dc564224',
            isItem: false,
        }];

        const actualOutput = getChildInfosFromRichText(richTextContent);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('returns an empty array for 0 child items in rich text element', () => {
        const expectedOutput = [];

        const actualOutput = getChildInfosFromRichText(childlessRichTextContent);

        expect(actualOutput).toEqual(expectedOutput);
    });
});

describe('getReferenceObject', () => {
    it('returns correct reference object', () => {
        const container = 'schemas';
        const name = 'SchemaArray';
        const expectedOutput = {
            $ref: `#/components/schemas/SchemaArray`,
        };

        const actualOutput = getReferenceObject(container, name);

        expect(actualOutput).toEqual(expectedOutput);
    });
});
