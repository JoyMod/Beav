import type { MembershipState } from './membershipModel';
import type { EntitlementKey } from './entitlementKeys';

const LOCAL_MEMBERSHIP_STATE: MembershipState = {
  active: true,
  founderActive: true,
  plan: 'local',
  expiresAtMs: null,
  entitlements: {},
};

export function useMembership() {
  return {
    bootstrapped: true,
    snapshot: null,
    state: LOCAL_MEMBERSHIP_STATE,
    can: (_entitlement: EntitlementKey | string) => true,
  };
}
