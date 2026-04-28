"use client";

// Tiny client component so the year refreshes per-render without
// flagging server-component time as dynamic.
export default function FooterYear() {
  const year = new Date().getFullYear();
  return <div className="footer">&copy; {year} William Hickox</div>;
}
