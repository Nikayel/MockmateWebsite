Tech: Next.js
14 (App Router) + Tailwind + Supabase
Auth
helpers.
\
Pages and flows:
/ (Landing): Hero, how it works, CTA “Start in VS Code,” link to docs.\
/login: Button to “Continue
with GitHub
” (Supabase). On success, redirect to deep link vscode://nikayel.MockMate/auth-callback?token=<jwt>.\
/pricing: Free vs Pro
shows
monthly
limits
link
“Upgrade to Pro.”\
/upgrade (protected): Calls your upgrade-tier edge
function
with user JWT;
on
success
shows
“You are Pro” and link to open VS Code: vscode://nikayel.MockMate/auth-callback
/account (protected): Shows tier, simulations used (fetch from profiles), “Manage billing” (optional future).
Connection details:
Use
@supabase
;/ -.19;AABBCEEIJLLNPPRSSTTUUUWX___aaaaaaaabbccccddddeeeeeeeeeeeeefghhhiiiiijlllmnnnnoooooprrrrsssssssttttttttttuuuvww{}
Upgrade
call:
\
POST to $
{
  SUPABASE_URL
}
;/functions/1v / upgrade - tier
with Authorization
: Bearer <jwt> from Supabase session.
Deep-link handoff back to the extension:
After login or upgrade, redirect to VS Code deep link: vscode: //nikayel.MockMate/auth-callback?token=<jwt>
