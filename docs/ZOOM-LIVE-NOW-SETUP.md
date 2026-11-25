# Ibemhal IAS Zoom classroom setup

The LMS can schedule a Zoom Meeting for a small class or a Zoom Webinar for a large audience. The class format is selected on the admin or teacher scheduling form. The free rehearsal uses **Meeting**; a 500 attendee event requires a Zoom Webinar 500 licence on the configured host. A selected number in the LMS is a planning limit, not proof of the account's Zoom licence.

## Account and application setup

1. Create a Zoom Server-to-Server OAuth app in the host account. Grant the scopes needed to read the host, create meetings and webinars, and request a host ZAK token. Activate the app in Zoom.
2. Create a Zoom Meeting SDK app. Add the exact local and deployed site origins to its allowed domains. A production domain must be added before the embedded classroom can join there.
3. Copy the names from `docs/zoom-env-template.txt` into `.env.local` for a local rehearsal and fill in the values from your Zoom account. Set them separately in Vercel Project Settings → Environment Variables for production. Use different account credentials for a free rehearsal and a paid production host if they are different accounts.

```dotenv
NEXT_PUBLIC_LIVE_NOW_PROVIDER=zoom
ZOOM_ACCOUNT_ID=
ZOOM_API_CLIENT_ID=
ZOOM_API_CLIENT_SECRET=
ZOOM_MEETING_SDK_CLIENT_ID=
ZOOM_MEETING_SDK_CLIENT_SECRET=
ZOOM_HOST_EMAIL=
```

The secrets stay on the server. Do not put them in `NEXT_PUBLIC_` variables, GitHub, or chat. Restart the local server after changing `.env.local`; redeploy after changing Vercel variables.

## Rehearsal

1. Open Admin → Zoom Integration and run **Check Zoom connection**. It verifies OAuth and the host lookup and shows the host's reported meeting and webinar capacity. This is a configuration check, not a completed join test.
2. Schedule a **Zoom Meeting** for 10 or 30 minutes with up to 50 students. A Zoom Basic account permits up to 100 participants but has its own time limit; keep the rehearsal within that limit.
3. Assign a test student to the class. Sign in as the teacher in one browser and the student in a separate browser. The teacher opens Zoom Studio and joins first. The student opens the assigned class. Confirm that the student can see and hear the teacher and that attendance, questions, and raised hands update in the LMS.
4. Test microphone, camera, screen sharing, student questions, leaving and rejoining, and the teacher's backup Zoom link. The LMS **Allow to speak** action approves the request in its own panel; the host must also grant microphone or promote the attendee using Zoom's controls. Webinar attendees remain view-only until promoted by the host.
5. Schedule a **Zoom Webinar** only after the host has a Webinar licence. Rehearse with the exact production account and domain before inviting 100–500 students.

Only authorized teacher and assigned student accounts can request an embedded SDK session. The student class-list response does not contain a standalone Zoom join link. A single configured host cannot run overlapping independent live sessions; multiple simultaneous classes need separate licensed Zoom hosts and account assignment work.

For a teacher to host a Zoom class, link the class to a course assigned to that teacher. Admin accounts can host all classes. This link uses account IDs rather than matching teacher display names.

The LMS does not create a paid Zoom licence or guarantee a 500 person broadcast. Verify the licence, account limits, SDK allowed domains, network capacity, and Zoom controls in a real two-browser rehearsal. The Admin → Zoom Integration panel reports whether configuration is present.
