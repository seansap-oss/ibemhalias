const safe = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

export async function sendPendingPaymentEmail(input: {
  to: string;
  cc?: string | null;
  buyer: string;
  institute: string;
  course: string;
  amountPaise: number;
  reference: string;
  customMessage?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;
  if (!key || !from) return { sent: false, reason: "Email service is not configured" };

  const messageBody =
    input.customMessage ||
    `Hi ${input.buyer}, we received your UPI payment reference (${input.reference}) for ${input.course} (₹${(
      input.amountPaise / 100
    ).toFixed(2)}). We will verify it and get back to you shortly.`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      ...(input.cc ? { cc: [input.cc] } : {}),
      subject: `${input.institute}: Payment reference received (${input.reference})`,
      html: `<h2>Payment Confirmation Received</h2><p>${safe(messageBody)}</p><hr/><p><strong>Course:</strong> ${safe(
        input.course
      )}</p><p><strong>Amount:</strong> ₹${(input.amountPaise / 100).toFixed(2)}</p><p><strong>UPI Ref:</strong> ${safe(
        input.reference
      )}</p>`,
    }),
  });
  return { sent: response.ok, reason: response.ok ? null : `Email provider returned ${response.status}` };
}

export async function sendCourseReceipt(input: {
  to: string;
  cc?: string | null;
  buyer: string;
  institute: string;
  course: string;
  receipt: string;
  amountPaise: number;
  customMessage?: string;
  tempPassword?: string | null;
  loginUrl?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;
  if (!key || !from) return { sent: false, reason: "Receipt email service is not configured" };

  const extraLogin = input.tempPassword
    ? `<p><strong>Your Student Portal Login:</strong> ${safe(input.loginUrl || "/login")}<br/><strong>Email:</strong> ${safe(
        input.to
      )}<br/><strong>Temporary Password:</strong> <code>${safe(input.tempPassword)}</code></p>`
    : `<p><strong>Student Portal:</strong> ${safe(input.loginUrl || "/login")} (sign in with ${safe(input.to)})</p>`;

  const messageHtml = input.customMessage ? `<p>${safe(input.customMessage)}</p>` : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      ...(input.cc ? { cc: [input.cc] } : {}),
      subject: `${input.institute} course payment receipt ${input.receipt}`,
      html: `<h1>Payment Verified &amp; Receipt</h1>${messageHtml}<p><strong>Institute:</strong> ${safe(
        input.institute
      )}</p><p><strong>Student:</strong> ${safe(input.buyer)}</p><p><strong>Course:</strong> ${safe(
        input.course
      )}</p><p><strong>Amount paid:</strong> ₹${(input.amountPaise / 100).toFixed(
        2
      )}</p><p><strong>Receipt:</strong> ${safe(input.receipt)}</p>${extraLogin}`,
    }),
  });
  return { sent: response.ok, reason: response.ok ? null : `Email provider returned ${response.status}` };
}
