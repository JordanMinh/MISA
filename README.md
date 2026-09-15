# MISA — production architecture

Frontend: static HTML/CSS/JS.
Backend: Supabase Postgres + Auth + Storage.
Hosting: GitHub Pages or Cloudflare Pages.

## Setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase_schema.sql`.
3. In Authentication > Users, create the one admin account you will use.
4. Copy that user's UUID and run the INSERT at the bottom of `supabase_schema.sql`.
5. Copy your Supabase Project URL and Publishable key into `config.js`.
6. In Supabase Authentication settings, disable public sign-ups if you want a single-admin site.
7. Publish this folder as a static site.

Do not put a service_role/secret key in `config.js` or any browser file.

Products are now global: when the admin adds/edits/hides/deletes a product, every visitor sees the database state. Saved products remain per-browser in localStorage, which is appropriate for anonymous bookmarks.


## Important: Admin access
The admin login uses Supabase Auth. Logging in successfully is not enough:
the same Auth user's UUID must also exist in `public.admin_users`.

After creating the admin user in Authentication -> Users, copy its User UID
and run this in SQL Editor:

insert into public.admin_users (user_id) values ('YOUR_USER_UUID');

Then sign in again. Product prices are entered and displayed in USD.
\n\n## Fixed build\nShared navigation now works on every page. Keep your existing `src/homepage/` folder unchanged beside these files; this package does not replace your original assets.\n