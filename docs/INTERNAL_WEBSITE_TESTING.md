# Test the commute MVP through the website

## Setup

Apply the migrations in `DATABASE_SETUP.md` to a staging Supabase project. Configure the app's URL and publishable key, and create test mentor, employee and employer accounts. Mentor accounts use the existing admin invitation process; public signup cannot select mentor.

Run `npm ci`, then `npm run dev`. Open http://localhost:3000. Use three separate browser sessions so the logins do not replace one another. This MVP needs real initialized tables; `/api/health` alone does not check database readiness.

## One complete test

1. Mentor: sign in and open `/app/mentor`. Select the test employee under **Invite an employee**, then **Invite**.
2. Employee: sign in, open **Commutes**, then **Accept mentor**. Before acceptance the mentor should not see this employee's trips.
3. Employee: expand **Request a ride**. Enter **From**, **To**, **Arrive by**, and optionally select the test employer. Click **Request ride**.
4. Mentor: refresh. Expand **Help arrange this ride**, enter who drives/whose car/where to meet, and choose a pickup time before arrival. Click **Send plan for confirmation**.
5. Employee: refresh, review the plan, then **Confirm ride**.
6. Employer: refresh **Commutes**. The selected employer should see the employee's trip and confirmed mentor plan. An unselected employer should not see it.
7. Mentor: click **Mark completed**, then select **Show finished trips**. Reload the page and verify the trip remains completed.
8. Repeat with the employer proposing the plan instead. Employee confirmation is still required, and the mentor can see and help complete the arrangement.

## Permission and failure checks

- End a pairing from either participant. The former mentor loses trip access and their upcoming plans return to Needs a ride.
- Remove employer sharing. The former employer loses access; its upcoming plan is withdrawn. A mentor's plan remains.
- Edit a proposed pickup time while another employee tab has an older version. Confirming the older version must show a refresh message.
- Try pickup after arrival or in the past. The server must reject it.
- Try another employee or unpaired mentor account. They must not see or change the trip.
- Check phone width, keyboard navigation, visible form labels, errors and confirmation messages.

## Automated checks

`npm test` runs UI/server-action/PostgreSQL integration and authorization tests without remote credentials. `npm run build` compiles and type-checks production. `npm run test:smoke` checks public pages and unauthenticated route boundaries after a build. `npm run test:stress` exercises only local health and authentication guards, not database write capacity.

The previous sample-only dashboard is gone. `/demo/mentor` is an explanation with a link to the signed-in workspace, not an alternate data store.
