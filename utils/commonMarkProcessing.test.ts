import { resolveChildrenAndCodeBlocks } from './commonMarkProcessing';

describe('resolveChildrenAndCodeBlocks', () => {
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
        code_sample_item_csharp: {
            code: 'code sample code',
            contentType: 'code_sample',
            id: '6d9f708d-8500-0159-ac96-a72fc7e5c8a0',
            platform: [],
            programmingLanguage: [
                'C#',
            ],
        },
        code_sample_item_curl: {
            code: 'code sample code',
            contentType: 'code_sample',
            id: '6d9f708d-8500-0159-ac96-a72fc7e5c8a0',
            platform: [],
            programmingLanguage: [
                'cURL',
            ],
        },
    };

    const calloutCodename = 'callout_item';
    const codeSampleCodename = 'code_sample_item';
    const codeSampleCodenameCsharp = 'code_sample_item_csharp';
    const codeSampleCodenameCurl = 'code_sample_item_curl';

    it('correctly replaces "{~" "~}" with simple backticks', () => {
        const text = '{~some text that should be highlighted~}';
        const expectedOutput = '`some text that should be highlighted`';

        const actualOutput = resolveChildrenAndCodeBlocks(text, {});

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('resolves marked callout in the text correctly', () => {
        const text =
            'Some text before' +
            `<!--codename=${calloutCodename}-->` +
            'Some text after';
        const expectedOutput =
            'Some text before' +
            `${items[calloutCodename].content}` +
            'Some text after';

        const actualOutput = resolveChildrenAndCodeBlocks(text, items);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('resolves marked code sample in the text correctly', () => {
        const text =
            'Some text before' +
            `<!--codename=${codeSampleCodename}-->\n` +
            'Some text after';
        const expectedOutput =
            'Some text before\n' +
            `\`\`\`json\n` +
            `${items[codeSampleCodename].code}\n` +
            `\`\`\`\n` +
            'Some text after';

        const actualOutput = resolveChildrenAndCodeBlocks(text, items);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('produces valid code block for a C# code sample', () => {
        const text =
            'Some text before' +
            `<!--codename=${codeSampleCodenameCsharp}-->\n` +
            'Some text after';
        const expectedOutput =
            'Some text before\n' +
            `\`\`\`csharp\n` +
            `${items[codeSampleCodenameCsharp].code}\n` +
            `\`\`\`\n` +
            'Some text after';

        const actualOutput = resolveChildrenAndCodeBlocks(text, items);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('produces valid code block for a cURL code sample', () => {
        const text =
            'Some text before' +
            `<!--codename=${codeSampleCodenameCurl}-->\n` +
            'Some text after';
        const expectedOutput =
            'Some text before\n' +
            `\`\`\`\n` +
            `${items[codeSampleCodenameCurl].code}\n` +
            `\`\`\`\n` +
            'Some text after';

        const actualOutput = resolveChildrenAndCodeBlocks(text, items);

        expect(actualOutput).toEqual(expectedOutput);
    });
});
