import {
    AzureFunction,
    Context,
} from '@azure/functions';
import { IBlobEventGridEvent } from 'cloud-docs-shared-code';
import { getBlobContainerName } from 'cloud-docs-shared-code/getBlobContainerName';
import { getBlobFromStorage } from 'cloud-docs-shared-code/getBlobFromStorage';
import { IPreprocessedData } from 'cloud-docs-shared-code/reference/preprocessedModels';
import { Configuration } from '../external/configuration';
import { generateApiSpecification } from '../generate/generateApiSpecification';

const eventGridTrigger: AzureFunction = async (context: Context, eventGridEvent: IBlobEventGridEvent): Promise<void> => {
    try {
        const container = getBlobContainerName(eventGridEvent);
        const isTest = container.includes('test');

        Configuration.set(isTest);

        const blob = await getBlobFromStorage<IPreprocessedData>(
            eventGridEvent.data.url,
            Configuration.keys.azureAccountName,
            Configuration.keys.azureStorageKey,
        );
        const yamlFile = generateApiSpecification(blob);

    } catch (error) {
        /** This try-catch is required for correct logging of exceptions in Azure */
        throw `Message: ${error.message} \nStack Trace: ${error.stack}`;
    }
};

export default eventGridTrigger;
