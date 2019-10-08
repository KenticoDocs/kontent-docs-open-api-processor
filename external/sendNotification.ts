import { EventGridClient } from 'azure-eventgrid';
import { EventGridEvent } from 'azure-eventgrid/lib/models';
import { TopicCredentials } from 'ms-rest-azure';
import { OpenAPISchemaValidatorResult } from 'openapi-schema-validator';
import {
    eventComposer,
    publishEventsCreator,
} from './eventGridClient';

export const sendNotification = async (
    specificationCodename: string,
    validationResult: OpenAPISchemaValidatorResult | string,
): Promise<void> => {
    const NotifierEndpoint: string = process.env['EventGrid.Notification.Endpoint'] || '';
    const EventGridKey: string = process.env['EventGrid.Notification.Key'] || '';

    if (EventGridKey && NotifierEndpoint) {
        const errorText: string = `Validation errors within API Specification ${specificationCodename}: `;
        const errorTextEscaped: string = errorText.replace(/_/g, '\\_');

        const text: string = `${errorTextEscaped} ${JSON.stringify(validationResult)}`;

        const topicCredentials: TopicCredentials = new TopicCredentials(EventGridKey);
        const eventGridClient: EventGridClient = new EventGridClient(topicCredentials);
        const publishEvents: (events: EventGridEvent[]) => Promise<void> = publishEventsCreator({
            eventGridClient,
            host: NotifierEndpoint,
        });

        const event: EventGridEvent = eventComposer('API Reference validation errors', text);
        await publishEvents([event]);
    }
};
