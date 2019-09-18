const styledComponents = require('styled-components');
const handlebars = require('handlebars');
const fs = require('fs');
const server = require('react-dom/server');
const React = require('react');
const consola = require('consola');
const redoc = require('kentico-cloud-docs-redoc');
const path = require('path');
const BUNDLES_DIR = path.dirname(require.resolve('kentico-cloud-docs-redoc'));

interface IRedocConfig {
    readonly cdn: boolean,
    readonly output: string,
    readonly redocOptions: object,
    readonly ssr: boolean,
    readonly templateFileName: string,
    readonly templateOptions: object,
    readonly title: string,
}

export const getHtml = async (templatePath: string, jsonPath: string, options: any): Promise<string> => {
    const start = Date.now();
    const spec = await redoc.loadAndBundleSpec(jsonPath);

    const config: IRedocConfig = {
        cdn: false,
        output: 'redoc-static.html',
        redocOptions: options || {},
        ssr: true,
        templateFileName: templatePath,
        templateOptions: {},
        title: 'ReDoc documentation',
    };

    const pageHTML = await getPageHtml(spec, jsonPath, config);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    const time = Date.now() - start;
    consola.log(`\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${time / 1000}s]`);

    return pageHTML;
};

const getPageHtml = async (
    spec: string,
    jsonPath: string,
    { ssr, cdn, title, templateFileName, templateOptions, redocOptions }: IRedocConfig,
): Promise<string> => {
    let html;
    let css;
    let state;
    let redocStandaloneSrc;
    if (ssr) {
        consola.log('Prerendering docs');
        // @ts-ignore
        const specUrl = redocOptions.specUrl || (isURL(jsonPath) ? jsonPath : undefined);
        const store = await redoc.createStore(spec, specUrl, redocOptions);
        const sheet = new styledComponents.ServerStyleSheet();
        html = server.renderToString(sheet.collectStyles(React.createElement(redoc.Redoc, { store })));
        css = sheet.getStyleTags();
        state = await store.toJS();
        if (!cdn) {
            redocStandaloneSrc = fs.readFileSync(path.join(BUNDLES_DIR, 'redoc.standalone.js'));
        }
    }
    templateFileName = templateFileName || path.join(__dirname, './template.hbs');
    const template = handlebars.compile(fs.readFileSync(templateFileName).toString());

    return template({
        redocHTML: `
    <div id="redoc">${(ssr && html) || ''}</div>
    <script>
    ${(ssr && `const __redoc_state = ${sanitizeJSONString(JSON.stringify(state))};`) || ''}

    let container = document.getElementById('redoc');
    Redoc.${ssr
            ? 'hydrate(__redoc_state, container);'
            : `init("spec.json", ${JSON.stringify(redocOptions)}, container)`};

    </script>`,
        redocHead: ssr
            ? (cdn
            ? '<script src="https://unpkg.com/redoc@next/bundles/redoc.standalone.js"></script>'
            : `<script>${redocStandaloneSrc}</script>`) + css
            : '<script src="redoc.standalone.js"></script>',
        templateOptions,
        title,
    });
};

const isURL = (str: string): boolean =>
    /^(https?:)\/\//m.test(str);

const sanitizeJSONString = (str: string): string =>
    escapeClosingScriptTag(escapeUnicode(str));

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
const escapeClosingScriptTag = (str: string): string =>
    str.replace(/<\/script>/g, '<\\/script>');

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
const escapeUnicode = (str: string): string =>
    str.replace(/\u2028|\u2029/g, (m) => '\\u202' + (m === '\u2028' ? '8' : '9'));
