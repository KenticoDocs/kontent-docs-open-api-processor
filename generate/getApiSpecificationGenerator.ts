import { ApiSpecificationGenerator } from './ApiSpecificationGenerator';

let apiSpecificationGenerator;

export const getApiSpecificationGenerator = (): ApiSpecificationGenerator => {
    if (apiSpecificationGenerator === undefined) {
        apiSpecificationGenerator = new ApiSpecificationGenerator();
    }

    return apiSpecificationGenerator;
};

export const initializeApiSpecificationGenerator = (): ApiSpecificationGenerator => {
    apiSpecificationGenerator = new ApiSpecificationGenerator();

    return apiSpecificationGenerator;
};
