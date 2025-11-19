import { IvsClient, CreateChannelCommand, GetStreamKeyCommand, ListChannelsCommand, ListStreamKeysCommand, ChannelType, CreateStreamKeyCommand, DeleteChannelCommandInput, DeleteChannelCommand } from "@aws-sdk/client-ivs";
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
/**
 * Creates a new IVS channel with the given name.
 * @param {string} name - The name of the channel.
 * @returns {Promise<any>} The created channel object.
 */
  const safeName = sanitizeChannelName(name);
  const command = new CreateChannelCommand({
    name: safeName,
    type: ChannelType.StandardChannelType,
    recordingConfigurationArn: RECORDING_CONFIG_ARN, // 🟢 This enables auto-recording
  });
  const response = await ivs.send(command);
  return response.channel;
}

export async function createStreamKey(channelArn: string) {
/**
 * Creates a new stream key for the specified IVS channel.
 * @param {string} channelArn - The ARN of the channel.
 * @returns {Promise<string | undefined>} The stream key value.
 */
  const command = new CreateStreamKeyCommand({ channelArn });
  const response = await ivs.send(command);
  return response.streamKey?.value;
}

export async function getStreamKeyMetadata(channelArn: string) {
/**
 * Retrieves the metadata for the first stream key of a channel.
 * @param {string} channelArn - The ARN of the channel.
 * @returns {Promise<any | null>} The stream key metadata or null if not found.
 */
  const command = new ListStreamKeysCommand({ channelArn });
  const response = await ivs.send(command);
  return response.streamKeys?.[0] ?? null;
}

export async function getStreamKeyValue(channelArn: string) {
/**
 * Retrieves the value of the first stream key for a channel.
 * @param {string} channelArn - The ARN of the channel.
 * @returns {Promise<string | null>} The stream key value or null if not found.
 */
  const streamKeyMeta = await getStreamKeyMetadata(channelArn);
  if (!streamKeyMeta?.arn) return null;

  const command = new GetStreamKeyCommand({ arn: streamKeyMeta.arn });
  const response = await ivs.send(command);
  return response.streamKey?.value ?? null;
}

export async function listChannels() {
/**
 * Lists all IVS channels.
 * @returns {Promise<any>} An array of channel objects.
 */
    const command = new ListChannelsCommand({});
    const response = await ivs.send(command);
    return response.channels;
}

export async function createChatRoom(eventName: string) {
/**
 * Creates a new IVS chat room for the given event name.
 * @param {string} eventName - The name of the event.
 * @returns {Promise<any>} The created chat room response.
 */
    const safeName = sanitizeChannelName(eventName);
    const command = new CreateRoomCommand({ name: safeName });
    const response = await ivsChat.send(command);
    return response;
}

export async function createChatToken(roomIdentifier: string, userId: string, userName: string) {
/**
 * Creates a chat token for a user in a specific chat room.
 * @param {string} roomIdentifier - The chat room identifier.
 * @param {string} userId - The user's ID.
 * @param {string} userName - The user's display name.
 * @returns {Promise<string | undefined>} The chat token.
 */
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

 export async function deleteChannel(stageArn: string) {
/**
 * Deletes an IVS channel by its ARN.
 * @param {string} stageArn - The ARN of the channel to delete.
 * @returns {Promise<any>} The result of the delete operation.
 */
    const input: DeleteChannelCommandInput = {
      arn: stageArn,
    };
    const command = new DeleteChannelCommand(input);
    const result = await ivs.send(command);
    return result;
  }

export async function getSavedBroadCastUrl(channelArn: string) {
/**
 * Retrieves the playback URL for the most recent saved broadcast in S3 for a channel.
 * @param {string} channelArn - The ARN of the channel.
 * @returns {Promise<string | undefined | null>} The playback URL or null if not found.
 */
const parts = channelArn.split("/");
const channelId = parts[parts.length - 1];
const partsId = channelArn.split(":");
const accountId = partsId[4];
const prefix = `ivs/v1/${accountId}/${channelId}/`;
const BUCKET_NAME="fanect-ppv-autorecording"
const command = new ListObjectsV2Command({
  Bucket: BUCKET_NAME,
  Prefix: prefix,
});
const result = await s3.send(command);
 const multivariantFiles = result.Contents?.filter((obj: any) =>
  obj.Key.endsWith("byte-range-multivariant.m3u8")
);
  if (multivariantFiles && multivariantFiles.length === 0) {
    console.log({
      error: "No multivariant playlists found in S3.",
    });
    return null;
  }
  console.log(multivariantFiles)
const sorted = multivariantFiles?.sort(
  (a: any, b: any) => new Date(b.LastModified).getTime() - new Date(a.LastModified).getTime()
);
const recording: any = sorted?.[0];
    if (!recording) {
    console.log({
      error: "No recording found yet in S3.",
    });
  }
  const playbackUrl =recording?.Key ? `https://${BUCKET_NAME}.s3.amazonaws.com/${recording?.Key}` : undefined;
  console.log(channelArn, 'Channel ARN')
  console.log(channelId, 'channed Id')
  console.log(playbackUrl, 'Saved Url')
  return playbackUrl
}