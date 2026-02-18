// src/scoring/collaboration.ts

interface CollaborationData {
  uniqueRepos: number;
  uniqueOrgs: number;           // distinct org/ prefixes in repo names
  uniqueCollaborators: number;  // distinct PR authors reviewed
}

export function computeCollaborationBreadth(data: CollaborationData): number {
  // Log-normalized product
  const repoScore = Math.log2(data.uniqueRepos + 1) / 6;    // 64 repos = 1.0
  const orgScore = Math.log2(data.uniqueOrgs + 1) / 4;      // 16 orgs = 1.0
  const collabScore = Math.log2(data.uniqueCollaborators + 1) / 5; // 32 collaborators = 1.0

  const raw = (repoScore * 0.4 + orgScore * 0.3 + collabScore * 0.3);
  return Math.max(0, Math.min(100, raw * 100));
}
