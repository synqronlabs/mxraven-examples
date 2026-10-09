/**
 * A template written as a React component and rendered server-side with
 * `@mxraven/react`. Plain elements and inline styles keep it email-safe.
 */
export function WelcomeEmail({ name }) {
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "24px" }}>Welcome, {name}!</h1>
      <p>
        This message was rendered from React and sent with <code>@mxraven/mail</code>.
      </p>
      <p style={{ color: "#666666" }}>The Acme team</p>
    </div>
  );
}
