import React from 'react';
import './Input.css';

export type InputProps = {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
  placeholder?: string;
};

export function Input(props: InputProps): React.JSX.Element {
  return (
    <input
      className="input"
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
    />
  );
}
