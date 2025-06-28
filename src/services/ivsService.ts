import { IvsClient, CreateChannelCommand, GetStreamKeyCommand, ListChannelsCommand, ListStreamKeysCommand, ChannelType } from "@aws-sdk/client-ivs";
import { CreateChatTokenCommand, CreateRoomCommand, IvschatClient } from "@aws-sdk/client-ivschat";
import {
  S3Client,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";

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
const s3 = new S3Client(awsConfig);

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

export async function getSavedBroadCastUrl(channelArn: string) {
const parts = channelArn.split("/");
const channelId = parts[parts.length - 1];
const prefix = `ivs/${channelId}/`;

const command = new ListObjectsV2Command({
  Bucket: "fanect-ppv-autorecording",
  Prefix: prefix,
});
const BUCKET_NAME="fanect-ppv-autorecording"
const result = await s3.send(command);
 const recording: any = result.Contents?.find((obj: any) =>
    obj.Key.endsWith("index.m3u8")
  );
    if (!recording) {
    console.log({
      error: "No recording found yet in S3.",
    });
  }

  const playbackUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${recording?.Key}`;
  console.log(channelArn, 'Channel ARN')
  console.log(channelId, 'channed Id')
  console.log(playbackUrl, 'Saved Url')
  return playbackUrl

}