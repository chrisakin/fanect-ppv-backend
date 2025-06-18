import { IvsClient, CreateChannelCommand, GetStreamKeyCommand, ListChannelsCommand, ListStreamKeysCommand } from "@aws-sdk/client-ivs";

const ivs = new IvsClient({ region: process.env.AWS_REGION });

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