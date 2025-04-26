import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type FridgeItemInput = {
  item_name: string;
  meta?: Record<string, unknown>;
};

export async function addFridgeItem(
  supabase: SupabaseClient,
  args: { items: FridgeItemInput[] },
) {
  if (!Array.isArray(args.items) || args.items.length === 0) {
    return {
      status: "error",
      detail: "No items provided.",
    };
  }
  // Prepare items for insertion
  const insertItems = args.items.map((item) => ({
    item_name: item.item_name,
    meta: item.meta ?? null,
  }));

  const { error } = await supabase.from("fridge_items").insert(insertItems);

  if (error) {
    console.error("Error adding items to fridge:", error);
    return {
      status: "error",
      detail: `Failed to add items: ${error.message}`,
    };
  }

  return {
    status: "success",
    detail: `Added ${args.items.length} item(s)`,
  };
}
