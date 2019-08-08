interface IConfiguration {
    readonly azureContainerName: string;
    readonly azureOutputContainerName: string;
    readonly azureStorageAccountName: string;
    readonly azureStorageKey: string;
}

export class Configuration {
    public static keys = {} as IConfiguration;

    public static set = (isTest: boolean) => {
        Configuration.keys = {
            azureContainerName: Configuration.getEnvironmentVariable('Azure.ContainerName', isTest),
            azureOutputContainerName: Configuration.getEnvironmentVariable('Azure.OutputContainerName', isTest),
            azureStorageAccountName: Configuration.getEnvironmentVariable('Azure.StorageAccountName', isTest),
            azureStorageKey: Configuration.getEnvironmentVariable('Azure.StorageKey', isTest),
        };
    };

    private static getEnvironmentVariable = (variableName: string, isTest?: boolean): string =>
        process.env[`${variableName}${isTest ? '.Test' : ''}`] || '';
}
