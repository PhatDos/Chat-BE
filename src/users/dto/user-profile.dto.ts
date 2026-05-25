export class UserProfileDto {
  id!: string;
  name!: string;
  imageUrl?: string | null;
  bio?: string | null;
  relationshipStatus?: 'SINGLE' | 'MARRIED' | 'DATING' | null;
  joinDate?: string | null;
  location?: string | null;
  isOnline!: boolean;
}
