import React, { useState, useEffect } from 'react';

interface Props {
  initialValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TextInput: React.FC<Props> = ({
  initialValue = '',
  onChange,
  placeholder = 'Enter text...',
  className = '',
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`border rounded px-3 py-2 ${className}`}
    />
  );
};

export default TextInput;
