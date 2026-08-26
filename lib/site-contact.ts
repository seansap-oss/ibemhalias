export const SITE_CONTACT = {
  helpdeskEmail: "ibemhaliashelpdesk@gmail.com",
  phoneDisplay: "+91 76290 49230",
  phoneE164: "+917629049230",
  whatsappNumber: "917629049230",
  whatsappMessage:
    "Hello Ibemhal IAS Helpdesk, I would like some assistance.",
} as const;

export const SITE_WHATSAPP_HREF =
  `https://wa.me/${SITE_CONTACT.whatsappNumber}?text=${encodeURIComponent(
    SITE_CONTACT.whatsappMessage
  )}`;
