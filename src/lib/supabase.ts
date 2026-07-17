import type { Database } from "@/lib/database.types"
import { createClient } from "@supabase/supabase-js"

export const supabase = createClient<Database>(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
	{
		auth: {
			detectSessionInUrl: true,
			flowType: "pkce",
			persistSession: true,
			autoRefreshToken: true,
		},
	},
)

/** Redirect target after Google (and other OAuth) sign-in. */
export function authRedirectTo() {
	return `${window.location.origin}/login`
}
