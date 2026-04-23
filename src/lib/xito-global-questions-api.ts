import { supabase } from "@/integrations/supabase/client";

export interface QuestionRow {
  id: string;
  question: string;
  sub_question: string;
  dropdown_enabled: boolean;
  dropdown_options: string[];
  text_input_enabled: boolean;
  number_input_enabled: boolean;
  number_input_hint: string;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionInput {
  question: string;
  sub_question?: string;
  dropdown_enabled?: boolean;
  dropdown_options?: string[];
  text_input_enabled?: boolean;
  number_input_enabled?: boolean;
  number_input_hint?: string;
  tags?: string[];
}

const TABLE = "xito_global_event_details_questions";

function normalize(row: any): QuestionRow {
  return {
    ...row,
    dropdown_options: Array.isArray(row.dropdown_options) ? row.dropdown_options : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
  } as QuestionRow;
}

export async function getAllQuestions(): Promise<QuestionRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function addQuestion(input: QuestionInput): Promise<QuestionRow> {
  // Put new question at end of sort order
  const { data: maxRows } = await supabase
    .from(TABLE)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (maxRows?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      question: input.question.trim(),
      sub_question: input.sub_question?.trim() ?? "",
      dropdown_enabled: input.dropdown_enabled ?? false,
      dropdown_options: input.dropdown_options ?? [],
      text_input_enabled: input.text_input_enabled ?? false,
      number_input_enabled: input.number_input_enabled ?? false,
      number_input_hint: input.number_input_hint ?? "",
      tags: input.tags ?? [],
      sort_order: nextOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<QuestionRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      question: input.question.trim(),
      sub_question: input.sub_question?.trim() ?? "",
      dropdown_enabled: input.dropdown_enabled ?? false,
      dropdown_options: input.dropdown_options ?? [],
      text_input_enabled: input.text_input_enabled ?? false,
      number_input_enabled: input.number_input_enabled ?? false,
      number_input_hint: input.number_input_hint ?? "",
      tags: input.tags ?? [],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function reorderQuestions(orderedIds: string[]): Promise<void> {
  // Sequential updates to avoid races
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from(TABLE).update({ sort_order: idx }).eq("id", id)
    )
  );
}

export function normalizeTag(input: string): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const SYSTEM_TAG_ALL_EVENTS = "all-events";