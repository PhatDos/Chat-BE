export const CHANNEL_MESSAGE_REPOSITORY = Symbol('CHANNEL_MESSAGE_REPOSITORY');

export interface IChannelMessageRepository {
  createMessage(data: {
    content: string;
    fileUrl?: string;
    fileType: string;
    memberId: string;
    channelId: string;
  }): Promise<any>;

  findOneMessage(id: string): Promise<any>;

  updateMessage(
    id: string,
    data: {
      content?: string;
      fileUrl?: string;
      deleted?: boolean;
    },
  ): Promise<any>;

  getMessages(channelId: string, limit: number, cursor?: string): Promise<any>;

  findChannel(channelId: string): Promise<any>;

  findMemberByUserId(userId: string, serverId: string): Promise<any>;

  findMemberByProfileId(profileId: string, serverId: string): Promise<any>;

  getMembersInServer(serverId: string, channelId: string): Promise<any>;

  getChannelRead(memberId: string, channelId: string): Promise<any>;

  upsertChannelRead(
    memberId: string,
    channelId: string,
    updateData: any,
    createData: any,
  ): Promise<any>;

  getTotalUnread(serverId: string, memberId: string): Promise<number>;
}
