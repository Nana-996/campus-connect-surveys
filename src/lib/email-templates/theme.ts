// Shared CampusVerify email styling.
// Body background stays #ffffff for email-client compatibility.
export const brand = {
  green: "#1f4d33",
  cream: "#f7f3e8",
  ink: "#171512",
  muted: "#5c5a54",
  line: "#e2dccb",
  gold: "#d8a72e",
};

export const main = {
  backgroundColor: "#ffffff",
  fontFamily: "Georgia, 'Times New Roman', serif",
  margin: "0",
  padding: "24px 0",
};

export const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "0",
};

export const card = {
  backgroundColor: brand.cream,
  border: `1px solid ${brand.line}`,
  borderRadius: "18px",
  padding: "32px 32px 28px",
};

export const masthead = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "26px",
  color: brand.green,
  margin: "0 0 4px",
  letterSpacing: "-0.5px",
};

export const kicker = {
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSize: "10px",
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  color: brand.muted,
  margin: "0 0 24px",
};

export const rule = {
  border: "none",
  borderTop: `1px solid ${brand.line}`,
  margin: "24px 0",
};

export const h1 = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "30px",
  lineHeight: "1.1",
  fontWeight: "normal" as const,
  color: brand.ink,
  margin: "0 0 16px",
};

export const text = {
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSize: "15px",
  lineHeight: "1.6",
  color: brand.muted,
  margin: "0 0 20px",
};

export const link = { color: brand.green, textDecoration: "underline" };

export const button = {
  backgroundColor: brand.green,
  color: "#ffffff",
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSize: "15px",
  fontWeight: "bold" as const,
  borderRadius: "999px",
  padding: "14px 28px",
  textDecoration: "none",
  display: "inline-block",
};

export const codeStyle = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "30px",
  letterSpacing: "6px",
  fontWeight: "bold" as const,
  color: brand.green,
  backgroundColor: "#ffffff",
  border: `1px solid ${brand.line}`,
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

export const footer = {
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#8b887f",
  margin: "0",
};
