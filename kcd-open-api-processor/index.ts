import {
    AzureFunction,
    Context,
} from '@azure/functions';
import { getBlobFromStorage } from 'cloud-docs-shared-code';
import { IPreprocessedData } from 'cloud-docs-shared-code/reference/preprocessedModels';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import { OpenAPIV3 } from 'openapi-types';
import * as YAML from 'yamljs';
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
        const specification = generateApiSpecification(blob);

        // await storeReferenceDataToBlobStorage(yaml, blob.zapiSpecificationCodename, blob.operation);

        const validator = new OpenAPISchemaValidator({
            version: 3,
        });

        const validationResults = validator.validate(specification as OpenAPIV3.Document);

        // if (validationResults.errors.length > 0) {
        //     context.log.error(validationResults.errors);
        //
        //     context.res = {
        //         body: validationResults.errors,
        //     };
        //     return;
        // }

        const yaml = YAML.stringify(specification, 4);

        context.res = {
            body: yaml,
        };
    } catch (error) {
        /** This try-catch is required for correct logging of exceptions in Azure */
        throw `Message: ${error.message} \nStack Trace: ${error.stack}`;
    }
};

export default eventGridTrigger;
