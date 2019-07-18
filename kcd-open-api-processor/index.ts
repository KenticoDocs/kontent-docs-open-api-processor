import {
    AzureFunction,
    Context,
} from '@azure/functions';
import { getBlobFromStorage } from 'cloud-docs-shared-code/getBlobFromStorage';
import { IPreprocessedData } from 'cloud-docs-shared-code/reference/preprocessedModels';
import { storeReferenceDataToBlobStorage } from '../external/blobManager';
import { Configuration } from '../external/configuration';
import { generateApiSpecification } from '../generate/generateApiSpecification';

const eventGridTrigger: AzureFunction = async (context: Context, eventGridEvent: any): Promise<any> => {
    try {
        // const container = getBlobContainerName(eventGridEvent.body);
        // const isTest = container.includes('test');

        Configuration.set(false);

        const blob = await getBlobFromStorage<IPreprocessedData>(
            eventGridEvent.body.data.url,
            Configuration.keys.azureStorageAccountName,
            Configuration.keys.azureStorageKey,
        );
        const yaml = generateApiSpecification(blob);

        // await storeReferenceDataToBlobStorage(yaml, blob.zapiSpecificationCodename, blob.operation);

        context.res = {
            body: yaml,
        };
    } catch (error) {
        /** This try-catch is required for correct logging of exceptions in Azure */
        throw `Message: ${error.message} \nStack Trace: ${error.stack}`;
    }
};

export default eventGridTrigger;
