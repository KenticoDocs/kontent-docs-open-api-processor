import {
    getChildInfosFromRichText,
    getReferenceObject,
} from './helpers';

const richTextContent = '<p>Some text.</p>\\n<h2>Heading</h2>\\n<object ' +
    'type=\\\"application/kenticocloud\\\" data-type=\\\"item\\\" data-rel=\\\"link\\\" ' +
    'data-codename=\\\"calloutos\\\"></object>\\n<p>Another text.</p>\\n<object ' +
    'type=\\\"application/kenticocloud\\\" data-type=\\\"item\\\" data-rel=\\\"component\\\" ' +
    'data-codename=\\\"ff9d6e8d_decc_0155_13bd_5b3da38f62f7\\\"></object>\\n<p>Even more text.</p>' +
    '\\n<object type=\\\"application/kenticocloud\\\" data-type=\\\"item\\\" data-rel=\\\"link\\\" ' +
    'data-codename=\\\"kontent_cank\\\"></object>\\n<p><br></p>';

describe('getChildInfosFromRichText', () => {
    it('returns correct information about children from rich text element', () => {
        const expectedOutput = [{
            codename: 'calloutos',
            isItem: true,
        }, {
            codename: 'ff9d6e8d_decc_0155_13bd_5b3da38f62f7',
            isItem: false,
        }, {
            codename: 'calloutos',
            isItem: true,
        }, {
            codename: 'calloutos',
            isItem: true,
        }];

        const actualOutput = getChildInfosFromRichText(richTextContent);
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
