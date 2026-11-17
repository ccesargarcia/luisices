export const BETA_ONLY_NO_DEV_DEPLOY_LABEL: string;

export interface DevDeployPolicyInput {
  eventName: string;
  ref: string;
  pullRequests?: Array<{
    merged_at?: string | null;
    labels?: Array<{ name?: string | null } | null>;
  }>;
}

export function shouldSkipDevDeploy(input: DevDeployPolicyInput): boolean;
