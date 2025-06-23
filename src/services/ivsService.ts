import { IvsClient, CreateChannelCommand, GetStreamKeyCommand, ListChannelsCommand, ListStreamKeysCommand, ChannelType } from "@aws-sdk/client-ivs";
import { CreateChatTokenCommand, CreateRoomCommand, IvschatClient } from "@aws-sdk/client-ivschat";

const awsConfig = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEYID!,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!
    }
};
const ivs = new IvsClient(awsConfig);
const ivsChat = new IvschatClient(awsConfig);
const RECORDING_CONFIG_ARN = process.env.RECORDING_CONFIG_ARN;
function sanitizeChannelName(name: string) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export async function createChannel(name: string) {
  const safeName = sanitizeChannelName(name);
  const command = new CreateChannelCommand({
    name: safeName,
    type: ChannelType.StandardChannelType,
    recordingConfigurationArn: RECORDING_CONFIG_ARN, // 🟢 This enables auto-recording
  });
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
    const safeName = sanitizeChannelName(eventName);
    const command = new CreateRoomCommand({ name: safeName });
    const response = await ivsChat.send(command);
    return response;
}

export async function createChatToken(roomIdentifier: string, userId: string, userName: string) {
    const command = new CreateChatTokenCommand({
        roomIdentifier,
        userId,
        attributes: { displayName: userName },
        capabilities: ['SEND_MESSAGE'],
        sessionDurationInMinutes: 180
    });
    const response = await ivsChat.send(command);
    return response.token;
}