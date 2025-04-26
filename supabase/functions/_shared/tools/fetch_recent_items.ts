import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function fetchRecentItems(
  supabase: SupabaseClient,
  args: { limit?: number },
) {
  const { data, error } = await supabase
    .from("fridge_items")
    .select("item_name,added_at")
    .order("added_at", { ascending: false })
    .limit(args.limit || 5);
  if (error) {
    console.error("Error fetching recent items:", error);
    return { items: [], error: error.message };
  }
  return { items: data };
}
