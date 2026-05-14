import type { AgentItem } from "../../types";
import { apiFetch } from "./client";

export type AgentRunStatus = "running" | "succeeded" | "failed";
export type AgentStepStatus = "running" | "ok" | "error";

interface CreateAgentRunInput {
  userId: string;
  widgetId: string;
  agentId: string;
  agentType: AgentItem["role"];
  prompt: string;
  scheduleCron?: string;
  workflowName?: string;
}

interface AppendAgentStepInput {
  runId: string;
  userId: string;
  stepIndex: number;
  stepType: string;
  status: AgentStepStatus;
  message: string;
  payload?: Record<string, unknown>;
}

interface CompleteAgentRunInput {
  runId: string;
  userId: string;
  status: Exclude<AgentRunStatus, "running">;
  attempts: number;
  resultSummary?: string;
  errorMessage?: string;
  workflowId?: string;
}

interface UpsertUserWorkflowInput {
  userId: string;
  workflowId: string;
  workflowName: string;
  agentType: AgentItem["role"];
  scheduleCron?: string;
  runId?: string;
}

export const createAgentRun = async (input: CreateAgentRunInput): Promise<string | null> => {
  const response = await apiFetch<{ id: string }>("/api/agent-runs", {
    method: "POST",
    body: {
      widgetId: input.widgetId,
      agentId: input.agentId,
      agentType: input.agentType,
      prompt: input.prompt,
      scheduleCron: input.scheduleCron,
      workflowName: input.workflowName
    }
  }).catch((error) => {
    if (error?.status === 401) return null;
    throw error;
  });
  return response?.id ?? null;
};

export const appendAgentStep = async (input: AppendAgentStepInput): Promise<void> => {
  await apiFetch(`/api/agent-runs/${encodeURIComponent(input.runId)}/steps`, {
    method: "POST",
    body: {
      stepIndex: input.stepIndex,
      stepType: input.stepType,
      status: input.status,
      message: input.message,
      payload: input.payload ?? {}
    }
  }).catch((error) => {
    if (error?.status === 401) return;
    throw error;
  });
};

export const completeAgentRun = async (input: CompleteAgentRunInput): Promise<void> => {
  await apiFetch(`/api/agent-runs/${encodeURIComponent(input.runId)}`, {
    method: "PATCH",
    body: {
      status: input.status,
      attempts: input.attempts,
      resultSummary: input.resultSummary,
      errorMessage: input.errorMessage,
      workflowId: input.workflowId
    }
  }).catch((error) => {
    if (error?.status === 401) return;
    throw error;
  });
};

export const upsertUserWorkflow = async (input: UpsertUserWorkflowInput): Promise<void> => {
  await apiFetch("/api/user-workflows", {
    method: "POST",
    body: {
      workflowId: input.workflowId,
      workflowName: input.workflowName,
      agentType: input.agentType,
      scheduleCron: input.scheduleCron,
      runId: input.runId
    }
  }).catch((error) => {
    if (error?.status === 401) return;
    throw error;
  });
};
