import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type FridgeItemInput = {
  item_name: string;
  expire_at?: string | null; // ISO8601 string or null
  note?: string | null;
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
    expire_at: item.expire_at ?? null,
    note: item.note ?? null,
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
