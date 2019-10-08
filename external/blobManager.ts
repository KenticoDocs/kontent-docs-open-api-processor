import { ContainerURL } from '@azure/storage-blob';
import { Configuration } from 'cloud-docs-shared-code';
import { ReferenceOperation } from 'cloud-docs-shared-code/reference/preprocessedModels';

const BlobStorage = require('@azure/storage-blob');

export const storeReferenceDataToBlobStorage = async (
    dataBlob: string,
    codename: string,
    operation: ReferenceOperation,
): Promise<void> => {
    const containerUrl = getContainerUrl();
    const blobName = getBlobName(codename, operation);
    const blobURL = BlobStorage.BlockBlobURL.fromContainerURL(containerUrl, blobName);

    await blobURL.upload(
        BlobStorage.Aborter.none,
        dataBlob,
        dataBlob.length,
    );
};

const getContainerUrl = (): ContainerURL => {
    const sharedKeyCredential = new BlobStorage.SharedKeyCredential(
        Configuration.keys.azureAccountName,
        Configuration.keys.azureStorageKey,
    );
    const pipeline = BlobStorage.StorageURL.newPipeline(sharedKeyCredential);
    const serviceUrl = new BlobStorage.ServiceURL(
        `https://${Configuration.keys.azureAccountName}.blob.core.windows.net`,
        pipeline,
    );

    return BlobStorage.ContainerURL.fromServiceURL(serviceUrl, Configuration.keys.azureContainerName);
};

export const getBlobName = (codename: string, operation: ReferenceOperation): string => {
    switch (operation) {
        case ReferenceOperation.Update:
        case ReferenceOperation.Initialize: {
            return `${codename}.html`;
        }
        // TODO Remove before merge to master
        case ReferenceOperation.Preview: {
            return codename.includes('TEMP')
                ? `${codename}-preview.json`
                : `${codename}-preview.html`;
        }
        default: {
            throw Error('Invalid operation');
        }
    }
};
