import { IvsClient, CreateChannelCommand, GetStreamKeyCommand, ListChannelsCommand, ListStreamKeysCommand } from "@aws-sdk/client-ivs";
import { CreateChatTokenCommand, CreateRoomCommand, IvschatClient } from "@aws-sdk/client-ivschat";

const ivs = new IvsClient({ region: process.env.AWS_REGION });
const ivsChat = new IvschatClient({ region: process.env.AWS_REGION });

export async function createChannel(name: string) {
    const command = new CreateChannelCommand({ name });
    const response = await ivs.send(command);
    return response.channel;
}

export async function getStreamKey(channelArn: string) {
    const command = new ListStreamKeysCommand({ channelArn });
    const response = await ivs.send(command);
    return response.streamKeys?.[0];
}

export async function listChannels() {
    const command = new ListChannelsCommand({});
    const response = await ivs.send(command);
    return response.channels;
}

export async function createChatRoom(eventName: string) {
    const command = new CreateRoomCommand({ name: eventName });
    const response = await ivsChat.send(command);
    return response;
}

export async function createChatToken(roomIdentifier: string, userId: string, userName: string) {
    const command = new CreateChatTokenCommand({
        roomIdentifier,
        userId,
        attributes: { name: userName },
        capabilities: ['SEND_MESSAGE', 'DISCONNECT_USER', 'DELETE_MESSAGE'], // adjust as needed
        sessionDurationInMinutes: 60
    });
    const response = await ivsChat.send(command);
    return response.token;
}