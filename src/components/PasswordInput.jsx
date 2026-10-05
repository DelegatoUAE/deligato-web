import { useState } from 'react';
import { Input } from '../design/ui';

function Eye({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * Password input with a "Show password" control BELOW the field (5 Oct): browsers and password
 * managers draw their own key icon inside the field's right edge, which covered the old inline
 * toggle. FormField's id and aria props pass through to the input.
 */
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-field">
      <Input {...props} type={show ? 'text' : 'password'} />
      <button
        type="button"
        className="pw-toggle"
        aria-pressed={show}
        aria-controls={props.id}
        onClick={() => setShow((v) => !v)}
      >
        <Eye off={show} />
        {show ? 'Hide password' : 'Show password'}
      </button>
    </div>
  );
}
