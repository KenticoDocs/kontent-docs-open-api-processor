| [master](https://github.com/KenticoDocs/cloud-docs-open-api-processor/tree/master) | [develop](https://github.com/KenticoDocs/cloud-docs-open-api-processor/tree/develop) |
|:---:|:---:|
| [![Build Status](https://travis-ci.com/KenticoDocs/cloud-docs-open-api-processor.svg?branch=master)](https://travis-ci.com/KenticoDocs/cloud-docs-open-api-processor/branches) [![codebeat badge](https://codebeat.co/badges/61fcce53-5a36-4770-8b4f-b0a6ccbfd059)](https://codebeat.co/projects/github-com-kenticodocs-cloud-docs-open-api-processor-master) | [![Build Status](https://travis-ci.com/KenticoDocs/cloud-docs-open-api-processor.svg?branch=develop)](https://travis-ci.com/KenticoDocs/cloud-docs-open-api-processor/branches) [![codebeat badge](https://codebeat.co/badges/81dfc1ab-c324-4478-9908-f4d0eacca3ce)](https://codebeat.co/projects/github-com-kenticodocs-cloud-docs-open-api-processor-develop) |

# Kentico Kontent Documentation - OpenAPI Processor

Backend function for Kentico Kontent documentation portal, which utilizes [Kentico Kontent](https://kontent.ai/) as a source of its data.

This service is responsible for creating HTML documents that represent API reference pages on the [documentation portal](https://docs.kontent.ai/), and passing them forward using [Azure Blob Storage](https://azure.microsoft.com/en-us/services/storage/blobs/).
It responds to events triggered by the blob storage, after the [Reference Preprocessor](https://github.com/KenticoDocs/cloud-docs-reference-preprocessor) creates a blob with the preprocessed data. The OpenAPI Processor then processes the data into HTML pages that are then saved in the Blob Storage.

## Overview
1. This project is a TypeScript Azure Functions application.
2. It is subscribed to an Azure [Event Grid](https://azure.microsoft.com/en-us/services/event-grid/) topic and listens for events. Each event contains information about the content that was changed.
3. After receiving an event, it fetches the content from the Blob storage.
4. The fetched content is first procesed into a JSON object, that is supposed to satisfy [OpenAPI Specification 3.0.2](https://github.com/OAI/OpenAPI-Specification) format. The JSON is also validated using the [openapi-schema-validator](https://www.npmjs.com/package/openapi-schema-validator) package.
5. The created JSON object is then processed by a forked [Redoc package](https://www.npmjs.com/package/kentico-cloud-docs-redoc). Redoc generates an HTML file that represents a single API Reference page.
6. Finally, a blob with the generated HTML is stored to an Azure Blob Storage.

## Setup

### Prerequisites
1. Node (+yarn) installed
2. Visual Studio Code installed
3. Subscriptions on Kentico Kontent

### Instructions
1. Open Visual Studio Code and install the prerequisites according to the [following steps](https://code.visualstudio.com/tutorials/functions-extension/getting-started).
2. Log in to Azure using the Azure Functions extension tab.
3. Clone the project repository and open it in Visual Studio Code.
4. Run `yarn install` in the terminal.
5. Set the required keys.
6. Deploy to Azure using Azure Functions extension tab, or run locally by pressing `Ctrl + F5` in Visual Studio Code.

#### Required Keys
* `Azure.StorageKey` - Azure Storage key
* `Azure.StorageAccountName` - Azure Storage account name
* `Azure.ContainerName` - Azure Storage container name - for HTML API Reference pages
* `Azure.SpecificationContainerName` - Azure Storage container name - for JSON API Reference specifications
* `EventGrid.Notification.Key` - Key for notification eventGrid topic
* `EventGrid.Notification.Endpoint` - Url for notification eventGrid topic

## Testing
* Run `yarn run test` in the terminal.

## How To Contribute
Feel free to open a new issue where you describe your proposed changes, or even create a new pull request from your branch with proposed changes.

## Licence
All the source codes are published under MIT licence.
