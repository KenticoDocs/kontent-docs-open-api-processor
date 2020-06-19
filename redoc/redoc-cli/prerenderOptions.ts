export const prerenderOptions = {
    disableSearch: true,
    expandSingleSchemaField: true,
    hideDownloadButton: true,
    hideLoading: true,
    hideSchemaTitles: true,
    hideSingleRequestSampleTab: true,
    jsonSampleExpandLevel: 5,
    pathInMiddlePanel: true,
    requiredPropsFirst: false,
    sortPropsAlphabetically: false,
    theme: {
        colors: {
            codeSample: {
                backgroundColor: 'transparent',
            },
            http: {
                basic: '#96A236',
                delete: '#B72929',
                get: '#36A284',
                head: '#231F20',
                link: '#908E8F',
                options: '#EBB500',
                patch: '#F05A22',
                post: '#8951A5',
                put: '#4863BE',
            },
            primary: {
                main: '#231F20',
            },
            responses: {
                error: {
                    backgroundColor: '#f7e9e9',
                    backgroundColorHover: '#f7e9e9',
                    color: '#B72929',
                },
                info: {
                    color: '#F05A22',
                },
                redirect: {
                    color: '#FBC15E',
                },
                success: {
                    backgroundColor: '#ecf6f2',
                    backgroundColorHover: '#ecf6f2',
                    color: '#36A284',
                },
            },
        },
        menu: {
            arrow: {
                color: '#F05A22',
                size: '1.125em',
            },
            backgroundColor: '#fff',
            textColor: '#908E8F',
            width: '352px',
        },
        rightPanel: {
            backgroundColor: '#fff',
            textColor: '#231F20',
            width: '40%',
        },
        schema: {
            labelsTextSize: '0.875em',
            linesColor: '#bcbbbb',
            nestedBackground: '#f3f3f3',
            requireLabelColor: '#B72929',
            typeNameColor: '#908E8F',
            typeTitleColor: '#F49300',
        },
        spacing: {
            unit: 4,
        },
        typography: {
            code: {
                backgroundColor: '#f3f6f7',
                color: '#E73430',
                fontFamily: 'Inconsolata, monospace',
                fontSize: '.875em',
            },
            fontFamily: 'GT Walsheim Pro, Helvetica, Arial, sans-serif',
            fontSize: '1em',
            fontWeightBold: 700,
            fontWeightRegular: 300,
            headings: {
                fontFamily: 'GT Walsheim Pro, Helvetica, Arial, sans-serif',
                fontSize: '1.875em',
                fontWeight: 400,
                lineHeight: '1.25em',
            },
            links: {
                color: '#F05A22',
                hover: '#F05A22',
            },
        },
    },
};
