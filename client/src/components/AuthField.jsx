export default function AuthField({ id, label, code = false, className = '', after, ...inputProps }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="field-label">{label}</label>
      </div>
      <input id={id} className={`field-input ${code ? 'code' : ''} ${className}`} {...inputProps} />
      {after}
    </div>
  );
}
