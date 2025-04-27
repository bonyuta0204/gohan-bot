import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type UpdateFridgeItemInput = {
  id: number;
  item_name?: string;
  expire_at?: string | null;
  note?: string | null;
};

/**
 * Update fields of an existing fridge item by id. Only provided fields will be updated.
 * @param supabase Supabase client
 * @param args { id, ...fieldsToUpdate }
 * @returns status and detail
 */
export async function updateFridgeItem(
  supabase: SupabaseClient,
  args: UpdateFridgeItemInput
) {
  const { id, ...fields } = args;
  if (typeof id !== "number" || Object.keys(fields).length === 0) {
    return {
      status: "error",
      detail: "Must provide id (number) and at least one field to update.",
    };
  }
  // Clean up fields: remove undefined
  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
    if (fields[key] !== undefined) {
      updates[key] = fields[key];
    }
  }
  if (Object.keys(updates).length === 0) {
    return {
      status: "error",
      detail: "No valid fields to update.",
    };
  }
  const { error } = await supabase
    .from("fridge_items")
    .update(updates)
    .eq("id", id);
  if (error) {
    console.error("Error updating fridge item:", error);
    return {
      status: "error",
      detail: `Failed to update item: ${error.message}`,
    };
  }
  return {
    status: "success",
    detail: `Updated fridge item with id ${id}`,
  };
}
