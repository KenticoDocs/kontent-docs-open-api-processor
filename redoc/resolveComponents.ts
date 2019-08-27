const cheerio = require('cheerio');
const htmlparser2 = require('htmlparser2');

const parserOptions = {
    decodeEntities: true,
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: false,
};

export const resolveComponents = (obj: object, key: string): object => {
    if (key === 'description' && typeof obj[key] === 'string') {
        const dom = htmlparser2.parseDOM(obj[key], parserOptions);
        const $ = cheerio.load(dom);
        let content = $.root().html().trim();
        const regexOpeningTag = /<!--(Callout|CodeSample[s]?)([ a-zA-Z=0-9_#.]*)-->/g;
        const regexClosingTag = /<!--(Callout-end|CodeSample[s]?-end)-->/g;
        const regexCode = /```[a-z]*/g;
        content = content.replace(regexOpeningTag, '<div class="$1"$2>');
        content = content.replace(regexClosingTag, '</div>');
        content = content.replace(regexCode, '');
        content = resolveCallout(content);
        content = resolveCodeSample(content);
        content = resolveCodeSamples(content);

        obj[key] = content;
    }

    return obj;
};

const resolveCallout = (content: string): string => {
    const dom = htmlparser2.parseDOM(content, parserOptions);
    const $ = cheerio.load(dom);
    const callouts = $('.Callout');

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < callouts.length; i++) {
        const callout = $(callouts[i]);
        callout.addClass(`callout--${callout.attr('type')}`);
        callout.attr('class', callout.attr('class').toLowerCase());
        callout.removeAttr('type');
    }

    return $.root().html().trim();
};

const resolveCodeSample = (content: string): string => {
    const dom = htmlparser2.parseDOM(content, parserOptions);
    const $ = cheerio.load(dom);
    const codeSamples = $('.CodeSample');

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < codeSamples.length; i++) {
        const codeSample = $(codeSamples[i]);
        const language = codeSample.attr('programminglanguage') || '';
        const platform = codeSample.attr('platform') || language;
        const codeSampleContent = codeSample.html();
        codeSample.replaceWith(`<pre class="line-numbers" data-platform-code-original="${platform}" ` +
            `data-platform-code="${platform.toLowerCase()}"><div class="infobar"><ul class="infobar__languages">` +
            `<li class="infobar__lang">${language}</li></ul><div class="infobar__copy">` +
            `</div></div><div class="clean-code">${codeSampleContent.trim()
                .replace(/\n\n/g, '\n&nbsp;\n')}</div></pre>`);
    }

    return $.root().html().trim();
};

const resolveCodeSamples = (content: string): string => {
    const dom = htmlparser2.parseDOM(content, parserOptions);
    const $ = cheerio.load(dom);
    const codeSamples = $('.CodeSamples');

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < codeSamples.length; i++) {
        const codeSampleGroup = $(codeSamples[i]);
        codeSampleGroup.removeAttr('class');
        codeSampleGroup.attr('class', 'code-samples');
        codeSampleGroup.prepend('<ul class="language-selector__list"></ul>');

        const samples = codeSampleGroup.find('[data-platform-code-original]');
        const langSelector = codeSampleGroup.find('.language-selector__list');

        // tslint:disable-next-line:prefer-for-of
        for (let j = 0; j < samples.length; j++) {
            const sample = $(samples[j]);
            const platformOriginal = sample.attr('data-platform-code-original');
            const platform = sample.attr('data-platform-code');
            langSelector.append(`<li class="language-selector__item"><a class="language-selector__link" ` +
                `href="#" data-platform="${platform}">${platformOriginal.replace('_', '.')}</a></li>`);
        }
    }

    return $.root().html().trim();
};
