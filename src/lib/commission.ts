/** Share of the commission paid to the agent when the same agent listed and sold the property. */
export const SAME_AGENT_SHARE = 0.6;
/** Share paid to each of the two agents when the listing agent and the selling agent differ. */
export const SPLIT_AGENT_SHARE = 0.3;

export type CommissionSplit = {
  /** One agent both listed and sold (a missing listing agent counts as the same agent). */
  same: boolean;
  /** Paid to the selling agent. */
  sold: number;
  /** Paid to the listing agent (0 when `same`). */
  listed: number;
  /** What's left after the agents' shares. */
  remaining: number;
  /** Share rate of each agent, 0.6 or 0.3. */
  rate: number;
};

export function commissionSplit(amount: number, listedBy: string | null | undefined, soldBy: string): CommissionSplit {
  const same = !listedBy || listedBy === soldBy;
  const rate = same ? SAME_AGENT_SHARE : SPLIT_AGENT_SHARE;
  const sold = Math.round(amount * rate);
  const listed = same ? 0 : Math.round(amount * rate);
  return { same, sold, listed, remaining: amount - sold - listed, rate };
}
