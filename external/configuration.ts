interface IConfiguration {
    readonly azureAccountName: string;
    readonly azureStorageKey: string;
}

export class Configuration {
    public static keys = {} as IConfiguration;

    public static set = (isTest: boolean) => {
        Configuration.keys = {
            azureAccountName: Configuration.getEnvironmentVariable('Azure.StorageAccountName'),
            azureStorageKey: Configuration.getEnvironmentVariable('Azure.StorageKey'),
        }
    };

    private static getEnvironmentVariable = (variableName: string, isTest?: boolean): string =>
        process.env[`${variableName}${isTest ? '.Test' : ''}`] || '';
}
