import type { ReactElement } from "react";

export interface ContactEmailProps {
  name: string;
  email: string;
  message: string;
}

/** Notification sent to the site owner when the contact form is submitted. */
export function ContactEmail({ name, email, message }: ContactEmailProps): ReactElement {
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "20px" }}>New contact form submission</h1>
      <p>
        <strong>Name:</strong> {name}
        <br />
        <strong>Email:</strong> {email}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>
    </div>
  );
}
