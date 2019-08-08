import {
    AzureFunction,
    Context,
} from '@azure/functions';
import {
    getBlobContainerName,
    getBlobFromStorage,
    IBlobEventGridEvent,
} from 'cloud-docs-shared-code';
import { IPreprocessedData } from 'cloud-docs-shared-code/reference/preprocessedModels';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import { OpenAPIV3 } from 'openapi-types';
import * as YAML from 'yamljs';
import { storeReferenceDataToBlobStorage } from '../external/blobManager';
import { Configuration } from '../external/configuration';
import { generateApiSpecification } from '../generate/generateApiSpecification';

const eventGridEvent: AzureFunction = async (
    context: Context,
    event: IBlobEventGridEvent,
): Promise<void> => {
    try {
        const container = getBlobContainerName(event);
        const isTest = container.includes('test');

        Configuration.set(isTest);

        const blob = await getBlobFromStorage<IPreprocessedData>(
            event.data.url,
            Configuration.keys.azureStorageAccountName,
            Configuration.keys.azureStorageKey,
        );
        const specification = generateApiSpecification(blob);

        const validator = new OpenAPISchemaValidator({
            version: 3,
        });

        const validationResults = validator.validate(specification as OpenAPIV3.Document);

        // TODO napoj na notifiera
        // if (validationResults.errors.length > 0) {
        //     context.log.error(validationResults.errors);
        //
        //     context.res = {
        //         body: validationResults.errors,
        //     };
        //     return;
        // }

        const yaml = YAML
            .stringify(specification, 12, 2)
            // Formats array of objects nicely, see https://github.com/jeremyfa/yaml.js/issues/117
            .replace(/(\s+\-)\s*\n\s+/g, '$1 ');

        await storeReferenceDataToBlobStorage(yaml, blob.zapiSpecificationCodename, blob.operation);

        context.res = {
            body: yaml,
        };
    } catch (error) {
        /** This try-catch is required for correct logging of exceptions in Azure */
        throw `Message: ${error.message} \nStack Trace: ${error.stack}`;
    }
};

export default eventGridEvent;
