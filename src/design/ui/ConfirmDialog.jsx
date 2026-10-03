import Button from './Button.jsx';
import Modal from './Modal.jsx';

/**
 * ConfirmDialog: replaces window.confirm. A destructive confirm has room
 * to say exactly what will be removed. The confirm label should repeat the
 * action ("Delete data room", not "OK").
 * tone: danger | primary. busy shows a spinner on the confirm button.
 */
export default function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      description={body}
      size="sm"
      dismissible={!busy}
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      )}
    />
  );
}
