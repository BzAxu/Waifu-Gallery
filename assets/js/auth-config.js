// Waifu-Gallery Supabase client configuration.
// The publishable/anon key is intended for browser use. NEVER put a service-role
// key, secret key, database password, or admin token in this file.
export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

// Copy the owner's Auth user UUID here only if you want the admin panel button
// to be shown in the browser. The server independently checks SITE_OWNER_USER_ID.
export const SITE_OWNER_USER_ID = "SET_AFTER_CREATING_OWNER_ACCOUNT";
