import { ContainerURL } from '@azure/storage-blob';
import { ReferenceOperation } from 'cloud-docs-shared-code/reference/preprocessedModels';
import { Configuration } from './configuration';

const BlobStorage = require('@azure/storage-blob');

export const storeReferenceDataToBlobStorage = async (
    dataBlob: string,
    codename: string,
    operation: ReferenceOperation,
): Promise<void> => {
    const containerUrl = getContainerUrl();
    const blobId = getBlobId(codename, operation);
    const blobURL = BlobStorage.BlobURL.fromContainerURL(containerUrl, blobId);
    const blockBlobURL = BlobStorage.BlockBlobURL.fromBlobURL(blobURL);

    const blob = JSON.stringify(dataBlob);

    await blockBlobURL.upload(
        BlobStorage.Aborter.none,
        blob,
        blob.length,
    );
};

const getContainerUrl = (): ContainerURL => {
    const sharedKeyCredential = new BlobStorage.SharedKeyCredential(
        Configuration.keys.azureStorageAccountName,
        Configuration.keys.azureStorageKey,
    );
    const pipeline = BlobStorage.StorageURL.newPipeline(sharedKeyCredential);
    const serviceUrl = new BlobStorage.ServiceURL(
        `https://${Configuration.keys.azureStorageAccountName}.blob.core.windows.net`,
        pipeline,
    );

    return BlobStorage.ContainerURL.fromServiceURL(serviceUrl, Configuration.keys.azureOutputContainerName);
};

export const getBlobId = (codename: string, operation: ReferenceOperation): string => {
    switch (operation) {
        case ReferenceOperation.Update:
        case ReferenceOperation.Initialize: {
            return codename;
        }
        case ReferenceOperation.Preview: {
            return `${codename}-preview`;
        }
        default: {
            throw Error('Invalid operation');
        }
    }
};
