import { IvsClient, CreateChannelCommand, GetStreamKeyCommand, ListChannelsCommand, ListStreamKeysCommand, ChannelType, CreateStreamKeyCommand, DeleteChannelCommandInput, DeleteChannelCommand } from "@aws-sdk/client-ivs";
import { CreateChatTokenCommand, CreateRoomCommand, IvschatClient } from "@aws-sdk/client-ivschat";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2CommandOutput
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

export async function createStreamKey(channelArn: string) {
  const command = new CreateStreamKeyCommand({ channelArn });
  const response = await ivs.send(command);
  return response.streamKey?.value;
}

export async function getStreamKeyMetadata(channelArn: string) {
  const command = new ListStreamKeysCommand({ channelArn });
  const response = await ivs.send(command);
  return response.streamKeys?.[0] ?? null;
}

export async function getStreamKeyValue(channelArn: string) {
  const streamKeyMeta = await getStreamKeyMetadata(channelArn);
  if (!streamKeyMeta?.arn) return null;

  const command = new GetStreamKeyCommand({ arn: streamKeyMeta.arn });
  const response = await ivs.send(command);
  return response.streamKey?.value ?? null;
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

 export async function deleteChannel(stageArn: string) {
    const input: DeleteChannelCommandInput = {
      arn: stageArn,
    };
    const command = new DeleteChannelCommand(input);
    const result = await ivs.send(command);
    return result;
  }

export async function getSavedBroadCastUrlV2(channelArn: string) {
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

export async function getSavedBroadCastUrl(
  channelArn: string,
  startedDate: Date
): Promise<string | null> {
  const parts = channelArn.split("/");
  const channelId = parts[parts.length - 1];
  const partsId = channelArn.split(":");
  const accountId = partsId[4];
  const prefix = `ivs/v1/${accountId}/${channelId}/`;
  const BUCKET_NAME = "fanect-ppv-autorecording";

  // Normalize startedDate to midnight
  const startedDay = new Date(startedDate);
  startedDay.setHours(0, 0, 0, 0);

  // 1️⃣ List all objects
  const listCmd = new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix });
  const result = await s3.send(listCmd);

  if (!result.Contents || result.Contents.length === 0) {
    console.log("No recordings found");
    return null;
  }

  // 2️⃣ Find variant playlists
  const variantPlaylists: Object[] = result.Contents.filter(
    (obj): obj is Object =>
      !!obj.Key &&
      obj.Key.endsWith("/playlist.m3u8") &&
      obj.Key.includes("/media/hls/")
  );

  if (variantPlaylists.length === 0) {
    console.log("No variant playlists found (e.g. 720p30/playlist.m3u8)");
    return null;
  }

  // 3️⃣ Group by session folder
  const sessionsMap = new Map<string, Object[]>();
  for (const obj of variantPlaylists as any) {
    const folder = obj.Key!.split("/media/hls/")[0];
    if (!sessionsMap.has(folder)) sessionsMap.set(folder, []);
    sessionsMap.get(folder)!.push(obj);
  }

  // 4️⃣ Filter by date
  const validSessions: string[] = [];
  for (const [folder] of sessionsMap) {
    const match = folder.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (!match) continue;
    const [, y, m, d] = match;
    const folderDate = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (folderDate.getTime() >= startedDay.getTime()) validSessions.push(folder);
  }

  if (validSessions.length === 0) {
    console.log("No sessions found after startedDate");
    return null;
  }

  // 5️⃣ Sort ascending
  validSessions.sort((a, b) => (a > b ? 1 : -1));

  // 6️⃣ Merge playlists with discontinuity markers
  let mergedContent = "#EXTM3U\n#EXT-X-VERSION:3\n";
  let first = true;

  for (const session of validSessions) {
    const variants: any = sessionsMap.get(session)!;
    const target = variants.find((v: any) => v.Key!.includes("720p30")) || variants[0];

    const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: target.Key });
    const file = await s3.send(getCmd);
    const text = await file.Body!.transformToString();

    const lines = text.split("\n");
    const segments = lines.filter(
      (l) => l.startsWith("#EXTINF") || l.endsWith(".ts")
    );

    const basePath = target.Key!.split("/playlist.m3u8")[0];
    const segmentUrls = segments.map((line) => {
      if (line.endsWith(".ts")) {
        return `https://${BUCKET_NAME}.s3.amazonaws.com/${basePath}/${line.trim()}`;
      }
      return line;
    });

    if (!first) {
      mergedContent += "#EXT-X-DISCONTINUITY\n"; // tell player new segment sequence
    } else {
      mergedContent += "#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n";
      first = false;
    }

    mergedContent += segmentUrls.join("\n") + "\n";
  }

  mergedContent += "#EXT-X-ENDLIST\n";

  // 7️⃣ Upload merged playlist
  const mergedKey = `${prefix}merged-${Date.now()}.m3u8`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: mergedKey,
      Body: mergedContent,
      ContentType: "application/vnd.apple.mpegurl",
    })
  );

  // 8️⃣ Return playback URL
  const playbackUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${mergedKey}`;
  console.log("✅ Merged all sessions into:", playbackUrl);
  return playbackUrl;
}
