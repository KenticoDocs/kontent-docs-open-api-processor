const matchAll = require('string.prototype.matchall');

export const resolveComponents = (obj: object, key: string): object => {
    if (key === 'description' && typeof obj[key] === 'string') {
        let content = obj[key];

        content = resolveCode(content);
        content = resolveCallouts(content);
        content = resolveCodeSamples(content);
        content = resolveCodeSamplesGroups(content);

        obj[key] = content;
    }

    return obj;
};

const resolveCode = (content) => {
    const regexCode = /```[a-z]*/g;

    content = content.replace(regexCode, '');
    return content;
};

const resolveCallouts = (content) => {
    const regexOpeningTag = /<!--Callout type=([a-zA-Z0-9_#.]*)-->/g;
    const regexClosingTag = /<!--Callout-end-->/g;

    content = content.replace(regexOpeningTag, (match, $1) => {
        return `<div class="callout callout--${$1.toLowerCase()}">`;
    });
    content = content.replace(regexClosingTag, '</div>');

    return content;
};

const resolveCodeSamples = (content: string): string => {
    // tslint:disable-next-line: max-line-length
    const regex = /<!--CodeSample programmingLanguage=([a-zA-Z0-9_#.]*) platform=([a-zA-Z0-9_#.]*)-->([\s\S]+?(?=<!--CodeSample-end-->))<!--CodeSample-end-->/g;

    content = content.replace(regex, (match, $1, $2, $3) => {
        const language = $1 || '';
        const platform = $2 || language;
        let codename = '';

        if (platform === '.NET') {
            codename = '_net';
        } else {
            codename = platform.toLowerCase();
        }

        return `<pre class="line-numbers" data-platform-code="${codename}" ` +
        `data-platform-code-original="${platform}"><div class="infobar"><ul class="infobar__languages">` +
        `<li class="infobar__lang">${language}</li></ul><div class="infobar__copy">` +
        `</div></div><div class="clean-code">${$3.trim()
            .replace(/\n\n/g, '\n&nbsp;\n')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</div></pre>`;
    });

    return content;
};

const resolveCodeSamplesGroups = (content: string): string => {
    const regex = /<!--CodeSamples-->([\s\S]+?(?=<!--CodeSamples-end-->))<!--CodeSamples-end-->/g;

    content = content.replace(regex, (match, $1) => {
        // tslint:disable-next-line: max-line-length
        const regexInner = /<pre class="line-numbers" data-platform-code="([a-zA-Z._#]+?)" data-platform-code-original="([a-zA-Z._#]+?)">/gi;
        const platforms = [...matchAll($1, regexInner)];
        let selector = '';

        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < platforms.length; i++) {
            selector += `<li class="language-selector__item"><a class="language-selector__link" ` +
            `href="#" data-platform="${platforms[i][1] ? platforms[i][1] : ''}">` +
            `${platforms[i][2] ? platforms[i][2] : ''}</a></li>`;
        }

        return `<div class="code-samples"><ul class="language-selector__list">${selector}</ul>${$1}</div>`;
    });

    return content;
};
