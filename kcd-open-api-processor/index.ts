import {
    AzureFunction,
    Context,
} from '@azure/functions';
import {
    Configuration,
    getBlobContainerName,
    getBlobFromStorage,
    IBlobEventGridEvent,
    ReferenceOperation,
} from 'cloud-docs-shared-code';
import { IPreprocessedData } from 'cloud-docs-shared-code/reference/preprocessedModels';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import { OpenAPIV3 } from 'openapi-types';
import { storeReferenceDataToBlobStorage } from '../external/blobManager';
import { initializeApiSpecificationGenerator } from '../generate/getApiSpecificationGenerator';
import { renderReference } from '../redoc/renderReference';

let apiSpecificationCodename;

export const eventGridEvent: AzureFunction = async (
    context: Context,
    event: IBlobEventGridEvent,
): Promise<void> => {
    try {
        apiSpecificationCodename = 'not yet processed';
        const container = getBlobContainerName(event);
        const isTest = container.includes('test');

        Configuration.set(isTest);

        const blob = await getBlobFromStorage<IPreprocessedData>(
            event.data.url,
            Configuration.keys.azureAccountName,
            Configuration.keys.azureStorageKey,
        );
        apiSpecificationCodename = blob
            ? blob.zapiSpecificationCodename
            : undefined;

        // API Specification has been deleted - Do not generate a new blob
        if (blob.operation === ReferenceOperation.Delete) {
            return;
        }

        const apiSpecificationGenerator = initializeApiSpecificationGenerator();
        const specification = apiSpecificationGenerator.generateApiSpecification(blob);

        const validator = new OpenAPISchemaValidator({
            version: 3,
        });

        const validationResults = validator.validate(specification as OpenAPIV3.Document);

        // TODO napoj na notifiera - nemoze zastavit generovanie HTML
        // if (validationResults.errors.length > 0) {
        //     context.log.error(validationResults.errors);
        //
        //     context.res = {
        //         body: validationResults.errors,
        //     };
        //     return;
        // }

        // const yaml = YAML
        //     .stringify(specification, 12, 2)
        //     // Formats array of objects nicely, see https://github.com/jeremyfa/yaml.js/issues/117
        //     .replace(/(\s+\-)\s*\n\s+/g, '$1 ');

        const stringSpec = JSON.stringify(specification);

        // TODO Remove this before merge to master
        await storeReferenceDataToBlobStorage(
            stringSpec,
            `TEMPORARY-${blob.zapiSpecificationCodename}`,
            blob.operation,
        );
        await renderReference(specification, blob);

        context.res = {
            body: stringSpec,
        };
    } catch (error) {
        /** This try-catch is required for correct logging of exceptions in Azure */
        throw `An error occurred while processing API Reference Specification with codename ${apiSpecificationCodename}`
        + ` \nMessage: ${error.message} \nStack Trace: ${error.stack}`;
    }
};
