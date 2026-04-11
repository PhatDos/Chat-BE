import { SetMetadata } from '@nestjs/common';

export const SKIP_PROFILE_GUARD_KEY = 'skipProfileGuard';
export const SkipProfileGuard = () => SetMetadata(SKIP_PROFILE_GUARD_KEY, true);
