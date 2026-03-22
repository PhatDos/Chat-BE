export class MemberEntity {
  private constructor(
    public id: string,
    public profileId: string,
    public serverId: string,
    public name: string,
  ) {}

  public static create(data: {
    id: string;
    profileId: string;
    serverId: string;
    name?: string;
  }): MemberEntity {
    return new MemberEntity(
      data.id,
      data.profileId,
      data.serverId,
      data.name ?? '',
    );
  }

  public ensureInServer(serverId: string) {
    if (this.serverId !== serverId) {
      throw new Error('User is not a member of this server');
    }
  }

  public static validateExists(
    member: any,
  ): asserts member is NonNullable<any> {
    if (!member) {
      throw new Error('Member not found');
    }
  }
}
