// SPDX-License-Identifier: GPL-3.0-or-later
//
// Typed wrappers over the framework's useTool/useToolMutation for the vcbrain
// tool surface. The shell provides session auth; /api/tools/vcbrain.* resolves
// the tenant from the session, so no custom routes are needed.

import { useTool, useToolMutation } from "@boringos/ui";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import type {
  Startup,
  Thesis,
  Memo,
  StartupFile,
  PortfolioSignal,
  ListResult,
  ThesisConfig,
} from "@boringos-vcbrain/shared";

// The published @boringos/ui types `useTool` loosely; re-type the results so
// the pages get full inference.
type Q<T> = UseQueryResult<T>;
type M<TInput, TResult> = UseMutationResult<TResult, Error, TInput>;

export function useStartups(params: { stage?: string; search?: string; orderBy?: string; limit?: number } = {}) {
  return useTool("vcbrain.startups.list", params, { refetchInterval: 8000 }) as Q<ListResult<Startup>>;
}

export function useStartup(id: string | undefined) {
  return useTool("vcbrain.startups.get", { id }, { enabled: !!id, refetchInterval: 8000 }) as Q<{ data: Startup }>;
}

export function useUpdateStartup() {
  return useToolMutation("vcbrain.startups.update") as M<Record<string, unknown>, { data: Startup }>;
}

export function useUpsertStartup() {
  return useToolMutation("vcbrain.startups.upsert") as M<Record<string, unknown>, { data: Startup; startupId: string; created: boolean }>;
}

export function useTheses() {
  return useTool("vcbrain.theses.list", {}, { refetchInterval: 15000 }) as Q<{ data: Thesis[] }>;
}

export function useUpdateThesis() {
  return useToolMutation("vcbrain.theses.update") as M<{ id: string; name?: string; config?: ThesisConfig }, { data: Thesis }>;
}

export function useCreateThesis() {
  return useToolMutation("vcbrain.theses.create") as M<{ name: string; config?: ThesisConfig; activate?: boolean }, { data: Thesis }>;
}

export function useActivateThesis() {
  return useToolMutation("vcbrain.theses.activate") as M<{ id: string }, { data: Thesis }>;
}

export type BacktestResult = {
  windowDays: number;
  total: number;
  scored: number;
  unscored: number;
  distribution: { strong: number; medium: number; weak: number };
};
export function useBacktest() {
  return useToolMutation("vcbrain.theses.backtest") as M<{ id?: string; days?: number }, BacktestResult>;
}

export function useMemos(startupId: string | undefined) {
  return useTool("vcbrain.memos.list", { startupId }, { enabled: !!startupId }) as Q<{ data: Memo[] }>;
}

export function usePublishMemo() {
  return useToolMutation("vcbrain.memos.publish") as M<{ id: string }, { data: Memo }>;
}

export function useFiles(startupId: string | undefined) {
  return useTool("vcbrain.files.list", { startupId }, { enabled: !!startupId }) as Q<{ data: StartupFile[] }>;
}

export function useSignals(startupId: string | undefined) {
  return useTool("vcbrain.portfolio.list_signals", { startupId }, { enabled: !!startupId }) as Q<{ data: PortfolioSignal[] }>;
}
