import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Delete one or more fridge items by their ids (primary key).
 * @param supabase Supabase client
 * @param args { ids: number[] }
 * @returns status and detail
 */
export async function deleteFridgeItem(
  supabase: SupabaseClient,
  args: { ids: number[] }
) {
  if (!Array.isArray(args.ids) || args.ids.length === 0 || args.ids.some(id => typeof id !== "number")) {
    return {
      status: "error",
      detail: "Invalid ids. Must be a non-empty array of numbers.",
    };
  }
  const { error } = await supabase
    .from("fridge_items")
    .delete()
    .in("id", args.ids);
  if (error) {
    console.error("Error deleting fridge items:", error);
    return {
      status: "error",
      detail: `Failed to delete items: ${error.message}`,
    };
  }
  return {
    status: "success",
    detail: `Deleted ${args.ids.length} fridge item(s) with ids [${args.ids.join(", ")}]`,
  };
}
