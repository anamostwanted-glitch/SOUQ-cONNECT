import React from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange }) => {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-primary' : 'bg-brand-border'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  );
};
