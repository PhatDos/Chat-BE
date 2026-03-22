import { MessageFileType } from '../value-objects/message-file-type.enum';

export class MessageEntity {
  private constructor(
    public id: string,
    public content: string,
    public fileUrl: string | undefined,
    public fileType: MessageFileType,
    public memberId: string,
    public channelId: string,
    public deleted: boolean = false,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public static create(data: {
    id?: string;
    content?: string;
    fileUrl?: string;
    fileType?: string | MessageFileType;
    memberId: string;
    channelId: string;
    deleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): MessageEntity {
    const content = data.content ?? '';

    if (!data.fileUrl && content.trim().length === 0) {
      throw new Error('Message content cannot be empty if no file is attached');
    }

    if (content.length > 2000) {
      throw new Error('Message content is too long');
    }

    return new MessageEntity(
      data.id ?? '', // Id might be generated later by Prisma, or can be passed if we use UUID generators
      content,
      data.fileUrl,
      (data.fileType as MessageFileType) ?? MessageFileType.text,
      data.memberId,
      data.channelId,
      data.deleted ?? false,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );
  }

  public markDeleted() {
    this.content = 'This message has been deleted';
    this.fileUrl = undefined;
    this.deleted = true;
    this.updatedAt = new Date();
  }

  public updateContent(content?: string, fileUrl?: string) {
    if (content && content.length > 2000) {
      throw new Error('Message content is too long');
    }
    if (content !== undefined) this.content = content;
    if (fileUrl !== undefined) this.fileUrl = fileUrl;
    this.updatedAt = new Date();
  }
}
