# Free Vercel setup with the professor

Repository: https://github.com/aec9692/Date-Night-MASH

Production branch: `main`. Public deployment URL: not assigned or verified in this session.

The November 20 GitHub audit confirmed a public repository with aec9692 (admin) and ajr243 (write), no homepage and zero recorded GitHub deployments. The third teammate has not joined; the owner will add them later. This evidence cannot rule out an unlinked external Vercel project. After setup, use DEPLOYED_ACCEPTANCE.md, record actual outcomes in TESTING.md, and finish RUBRIC_CHECKLIST.md. A successful Git merge is not proof of a deployment.

1. Sign in to Vercel using the repository owner's GitHub account and select the free Hobby plan. No credit card, paid API, database or app accounts are needed.
2. Import `aec9692/Date-Night-MASH`. Use the repository root and the detected Express setup with Node.js 24. Keep the default install behavior so `npm ci` prepares the local PDF library. Do not configure a custom output directory; this app serves `public` and exports Express from root `server.js`.
3. Deploy, then open `/`, `/api/health` and `/api/options` at the returned HTTPS URL. Confirm the health response and generate a date through the interface.
4. Confirm the Git integration deploys `main`, copy the actual public URL into README.md, and record the deployed checks in TESTING.md.
5. Run PHONE_QA.md on actual iPhone Safari and Android Chrome. Share links between phones using the public URL, not localhost.

No API keys are required for the current free discovery providers. Read LOCATION_SEARCH.md before broad/commercial distribution: the public providers have terms, limits and no uptime guarantee. Source-priced NJ discovery also works independently of live map lookups.

Calendar features open Google drafts or Apple-compatible .ics imports; the user reviews and saves in their calendar. Share date opens the system share sheet when supported, with link/note fallbacks. This is a responsive web app and home-screen install, not an App Store submission.


Official references: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express), [Hobby plan](https://vercel.com/docs/plans/hobby). This classroom deployment uses the free personal/non-commercial plan; do not select a paid trial or add billing details for this setup.
