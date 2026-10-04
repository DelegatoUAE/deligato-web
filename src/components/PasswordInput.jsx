import { useState } from 'react';
import { Input } from '../design/ui';

/** Password input with a Show / Hide toggle. FormField's id and aria props pass through to the input. */
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-field">
      <Input {...props} type={show ? 'text' : 'password'} />
      <button type="button" className="pw-toggle" aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
