"use client";

import { useMemo } from "react";
import { family, formatPeriod, formatValue, ticker } from "@/lib/format";
import { useLiveFeeds } from "@/lib/use-live-feeds";

const TITLES: Record<string, string> = {
  "EIA.PET.PRICE.WTI.DAILY": "WTI crude spot",
  "EIA.NG.PRICE.HENRYHUB.DAILY": "Henry Hub natural gas",
  "EIA.NG.STORAGE.L48_WORKING.WEEKLY": "Lower-48 working gas in storage",
  "EIA.ELEC.DEMAND.US48.HOURLY": "US grid demand",
  "EIA.ELEC.GEN_SUN.US48.HOURLY": "US48 solar generation",
  "EIA.CO2.AGG.US_TOTAL.ANNUAL": "US energy CO2 emissions",
  "OP-1": "San Diego parking revenue",
};

export interface Feed {
  id: string;
  name: string;
  label: string;
  family: string;
  value: number | null;
  amount: string;
  decimals: number;
  unit: string;
  frequency: string;
  period: string;
  sourcePeriod: number | null;
  hash: string;
  attester: string;
}

export const format = (feed: Feed) =>
  feed.value === null ? "-" : formatValue(feed.value, feed.decimals);

export function useLandingFeeds() {
  const live = useLiveFeeds();
  const feeds = useMemo(
    () =>
      live.feeds.map(
        (feed): Feed => ({
          id: feed.feed_id,
          name: TITLES[feed.feed_id] || feed.title || ticker(feed.feed_id),
          label: ticker(feed.feed_id),
          family: family(feed.feed_id) || "Civic revenue",
          value: Number.isFinite(feed.value) ? feed.value : null,
          amount: feed.amount,
          decimals: feed.decimals,
          unit: feed.unit,
          frequency: feed.frequency,
          period: formatPeriod(feed.period, feed.frequency),
          sourcePeriod: feed.period,
          hash: feed.source_hash,
          attester: feed.attester,
        }),
      ),
    [live.feeds],
  );

  const byId = (id: string): Feed =>
    feeds.find((feed) => feed.id === id) ?? {
      id,
      name: TITLES[id] || ticker(id),
      label: ticker(id),
      family: family(id) || "Civic revenue",
      value: null,
      amount: "-",
      decimals: 0,
      unit: "",
      frequency: "",
      period: live.loading ? "Loading reading" : "Reading unavailable",
      sourcePeriod: null,
      hash: "",
      attester: "-",
    };

  return {
    byId,
    stats: {
      feeds: live.stats.feedsLive,
      attestations: live.stats.attestations,
      datasets: live.stats.datasets,
    },
    loading: live.loading,
    error: live.error,
    updatedAt: live.updatedAt,
  };
}
