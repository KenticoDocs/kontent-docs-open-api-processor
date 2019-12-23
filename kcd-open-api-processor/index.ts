import {
    AzureFunction,
    Context,
} from '@azure/functions';
import { OpenApiSpec } from '@loopback/openapi-v3-types';
import {
    Configuration,
    getBlobContainerName,
    getBlobFromStorage,
    IBlobEventGridEvent,
    Operation,
} from 'kontent-docs-shared-code';
import { IPreprocessedData } from 'kontent-docs-shared-code/reference/preprocessedModels';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import { OpenAPIV3 } from 'openapi-types';
import {
    getBlobName,
    storeReferenceDataToBlobStorage,
} from '../external/blobManager';
import { sendNotification } from '../external/sendNotification';
import { initializeApiSpecificationGenerator } from '../generate/getApiSpecificationGenerator';
import { renderReference } from '../redoc/renderReference';

let apiSpecificationCodename;

export const eventGridEvent: AzureFunction = async (
    context: Context,
    event: IBlobEventGridEvent,
): Promise<void> => {
    try {
        /*
        apiSpecificationCodename = 'not yet processed';
        const container = getBlobContainerName(event);
        const isTest = container.includes('test');
        */

        Configuration.set(false);

        const url: string = 'https://kcddev.blob.core.windows.net/reference-data-tests/management_api_v2';

        const blob = await getBlobFromStorage<IPreprocessedData>(
            url,
            Configuration.keys.azureAccountName,
            Configuration.keys.azureStorageKey,
        );
        apiSpecificationCodename = blob
            ? blob.zapiSpecificationCodename
            : undefined;

        // API Specification has been deleted - Do not generate a new blob
        if (blob.operation === Operation.Delete) {
            return;
        }

        const apiSpecificationGenerator = initializeApiSpecificationGenerator();
        const specification = apiSpecificationGenerator.generateApiSpecification(blob);

        await validateApiSpecification(specification);

        const stringSpec = await storeApiSpecificationToBlob(specification, blob);

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

const validateApiSpecification = async (specification: OpenApiSpec): Promise<void> => {
    const validator = new OpenAPISchemaValidator({
        version: 3,
    });

    const validationResults = validator.validate(specification as OpenAPIV3.Document);

    if (validationResults.errors.length > 0) {
        await sendNotification(apiSpecificationCodename, validationResults);
    }
};

const storeApiSpecificationToBlob = async (specification: OpenApiSpec, blob: IPreprocessedData): Promise<string> => {
    const specificationContainer = process.env['Azure.SpecificationContainerName'] || '';
    const stringSpec = JSON.stringify(specification);

    const blobName = getBlobName(blob.zapiSpecificationCodename, 'json', blob.operation);
    await storeReferenceDataToBlobStorage(
        stringSpec,
        blobName,
        specificationContainer,
    );

    return stringSpec;
};
