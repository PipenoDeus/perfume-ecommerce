import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = "1";
const role = "dueño"; // o "dueño"

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { role },
});

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("✅ Rol actualizado:", data.user.id, data.user.app_metadata);
