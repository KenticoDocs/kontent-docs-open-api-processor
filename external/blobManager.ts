import { ContainerURL } from '@azure/storage-blob';
import { Configuration } from 'kontent-docs-shared-code';
import { Operation } from 'kontent-docs-shared-code/reference/preprocessedModels';

const BlobStorage = require('@azure/storage-blob');

export const storeReferenceDataToBlobStorage = async (
    dataBlob: string,
    blobName: string,
    containerName: string,
): Promise<void> => {
    const containerUrl = getContainerUrl(containerName);
    const blobURL = BlobStorage.BlockBlobURL.fromContainerURL(containerUrl, blobName);

    await blobURL.upload(
        BlobStorage.Aborter.none,
        dataBlob,
        dataBlob.length,
    );
};

const getContainerUrl = (containerName: string): ContainerURL => {
    const sharedKeyCredential = new BlobStorage.SharedKeyCredential(
        Configuration.keys.azureAccountName,
        Configuration.keys.azureStorageKey,
    );
    const pipeline = BlobStorage.StorageURL.newPipeline(sharedKeyCredential);
    const serviceUrl = new BlobStorage.ServiceURL(
        `https://${Configuration.keys.azureAccountName}.blob.core.windows.net`,
        pipeline,
    );

    return BlobStorage.ContainerURL.fromServiceURL(serviceUrl, containerName);
};

export const getBlobName = (codename: string, ending: string, operation: Operation): string => {
    switch (operation) {
        case Operation.Update:
        case Operation.Initialize: {
            return `${codename}.${ending}`;
        }
        case Operation.Preview: {
            return `${codename}-preview.${ending}`;
        }
        default: {
            throw Error('Invalid operation');
        }
    }
};
