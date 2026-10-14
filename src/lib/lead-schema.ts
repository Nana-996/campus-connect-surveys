import { z } from "zod";
const opt = (n: number) => z.string().trim().max(n).optional().transform((v) => v || null);
export const leadSchema = z.object({
  kind: z.enum(["school", "demo", "study"]),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: opt(40), organization: opt(160), role_title: opt(120), country: opt(80),
  student_count: opt(40), message: opt(2000), sample_size: opt(120),
  contact_preference: z.enum(["email", "whatsapp", "phone"]).optional().default("email"),
}).refine((d) => d.contact_preference === "email" || Boolean(d.phone), {
  path: ["phone"], message: "Add a phone number for phone or WhatsApp contact.",
});