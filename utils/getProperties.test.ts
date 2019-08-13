import { getGenericProperty } from './getProperties';

describe('getGenericProperty', () => {
    const conditionFunction = (text: string): boolean => text.length > 0;
    const insertionFunction = (text: string): number => text.length;
    const getStringLengthProperty = getGenericProperty(conditionFunction, insertionFunction);

    const properyName = 'stringLength';

    it('creates property stringLength when length > 0', () => {
        const text = 'some text to test getGenericProperty function';
        const expectedOutput = {
            stringLength: text.length,
        };

        const actualOutput = getStringLengthProperty(text, properyName);

        expect(actualOutput).toEqual(expectedOutput);
    });

    it('returns an empty object for an empty string', () => {
        const emptyText = '';
        const expectedOutput = {};

        const actualOutput = getStringLengthProperty(emptyText, properyName);

        expect(actualOutput).toEqual(expectedOutput);
    });
});
