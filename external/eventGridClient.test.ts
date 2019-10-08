import { EventGridModels } from 'azure-eventgrid';

import {
    eventComposer,
    IDeps,
    publishEventsCreator,
} from './eventGridClient';

describe('eventComposer', () => {
    test('composes event with data of notification', async () => {
        const activityTitle: string = 'activity title';
        const text: string = 'notification text';
        const event: EventGridModels.EventGridEvent = eventComposer(activityTitle, text);

        expect(event.id).toBeTruthy();
        expect(event.subject).toBeTruthy();
        expect(event.eventType).toBe('KenticoDocs.Notification.Created');
        expect(event.dataVersion).toBe('1.0');
        expect(event.data.activityTitle).toBe(activityTitle);
        expect(event.data.text).toBe(text);
        expect(event.data.mode).toBe('error');
        expect(event.eventTime).toBeTruthy();
    });
});

const eventGridClient: any = {
    publishEvents: jest.fn(),
};

const host: string = 'fake.url-to-webhook.cloud';
const fakeHost: string = `http://${host}/api/webhook`;
const events: EventGridModels.EventGridEvent[] = [
    {
        data: { xxx: 'xxx' },
        dataVersion: '1.0',
        eventTime: new Date(),
        eventType: 'test_event',
        id: 'x',
        metadataVersion: undefined,
        subject: 'test',
        topic: undefined,
    },
];

describe('publishEvents', () => {
    test('calls publishEvents with correct host and events', async () => {
        const deps: IDeps = {
            eventGridClient,
            host: fakeHost,
        };

        await publishEventsCreator(deps)(events);

        expect(eventGridClient.publishEvents.mock.calls[0][0]).toBe(host);
        expect(eventGridClient.publishEvents.mock.calls[0][1]).toBe(events);
    });
});
