import { useState, useEffect, useRef } from 'react';

type InputModalProps = {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  title,
  placeholder = '',
  defaultValue = '',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Focus after a tick to ensure the modal is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-[380px] rounded-xl border border-outline-variant/25 shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1a1a1a 0%, #131313 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-on-surface/90 font-display">{title}</h3>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-5 pb-5">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-surface-container-highest/80 text-on-surface text-sm px-3.5 py-2.5 rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-secondary/40 font-sans"
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 text-[13px] text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-[13px] bg-primary/15 text-primary hover:bg-primary/25 rounded-lg transition-colors font-medium border border-primary/20"
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
