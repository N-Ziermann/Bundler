import React from 'react';
import './Button.css';

export type ButtonProps = {
  onClick: () => void;
  title: string;
  type?: 'submit' | 'reset' | 'button';
};

export function Button(props: ButtonProps): React.JSX.Element {
  const buttonType = props.type ?? 'button';
  return (
    <button className="button" onClick={props.onClick} type={buttonType}>
      {props.title}
    </button>
  );
}
