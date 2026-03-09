import type { AgentItem } from "../types";
import { supabase } from "./supabase";

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
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      user_id: input.userId,
      widget_id: input.widgetId,
      agent_id: input.agentId,
      agent_type: input.agentType,
      prompt: input.prompt,
      schedule_cron: input.scheduleCron ?? null,
      workflow_name: input.workflowName ?? null,
      status: "running"
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return (data?.id as string | undefined) ?? null;
};

export const appendAgentStep = async (input: AppendAgentStepInput): Promise<void> => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("agent_steps").insert({
    run_id: input.runId,
    user_id: input.userId,
    step_index: input.stepIndex,
    step_type: input.stepType,
    status: input.status,
    message: input.message,
    payload: input.payload ?? {}
  });

  if (error) {
    throw error;
  }
};

export const completeAgentRun = async (input: CompleteAgentRunInput): Promise<void> => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("agent_runs")
    .update({
      status: input.status,
      attempts: input.attempts,
      result_summary: input.resultSummary ?? null,
      error_message: input.errorMessage ?? null,
      workflow_id: input.workflowId ?? null,
      finished_at: new Date().toISOString()
    })
    .eq("id", input.runId)
    .eq("user_id", input.userId);

  if (error) {
    throw error;
  }
};

export const upsertUserWorkflow = async (input: UpsertUserWorkflowInput): Promise<void> => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("user_workflows").upsert(
    {
      user_id: input.userId,
      workflow_id: input.workflowId,
      workflow_name: input.workflowName,
      agent_type: input.agentType,
      schedule_cron: input.scheduleCron ?? null,
      created_from_run_id: input.runId ?? null,
      last_synced_at: new Date().toISOString()
    },
    { onConflict: "user_id,workflow_id" }
  );

  if (error) {
    throw error;
  }
};
