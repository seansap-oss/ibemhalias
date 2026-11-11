# Ibemhal IAS — Zoom Webinar / Live Now Setup (v5.5.7)

The code is ready before a Zoom license is purchased. No Zoom secret is committed.

## Vercel Production variables

NEXT_PUBLIC_LIVE_NOW_PROVIDER=zoom
ZOOM_LIVE_MODE=webinar
ZOOM_ACCOUNT_ID=
ZOOM_API_CLIENT_ID=
ZOOM_API_CLIENT_SECRET=
ZOOM_MEETING_SDK_CLIENT_ID=
ZOOM_MEETING_SDK_CLIENT_SECRET=
ZOOM_HOST_EMAIL=

Never paste Zoom Client Secrets into chat or GitHub.

## Free rehearsal mode

For a small rehearsal before the Webinar licence is bought, set
`ZOOM_LIVE_MODE=meeting`. The LMS will create a standard scheduled Zoom Meeting
using the exact same embedded classroom, access checks, Q&A, raised-hand and
attendance flow. A free Zoom Meeting account is limited to 100 attendees, so
switch this value back to `webinar` for the 100–200 attendee launch and assign
a Webinar licence to `ZOOM_HOST_EMAIL`.

Teachers use individual Ibemhal Instructor accounts. The Zoom host credential is
managed by the backend. Students remain view-only Webinar attendees unless the
Zoom host promotes them. Student access is still checked against the existing
Ibemhal `live_class_assignments` entitlement before an SDK join signature is returned.

If the LMS is unavailable, the licensed Zoom host can start the same webinar in
the Zoom desktop/web app and distribute the standalone join link.
