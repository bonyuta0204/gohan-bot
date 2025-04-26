import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function addFridgeItem(
  supabase: SupabaseClient,
  args: { item_name: string },
) {
  const { error } = await supabase.from("fridge_items").insert({
    item_name: args.item_name,
  });

  if (error) {
    console.error("Error adding item to fridge:", error);
    return {
      status: "error",
      detail: `Failed to add item: ${error.message}`,
    };
  }

  return {
    status: "success",
    detail: `Added ${args.item_name}`,
  };
}
