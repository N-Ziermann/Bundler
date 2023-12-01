import React from 'react';
import xSquare from '../assets/x-square.svg';
import './Todo.css';

export type TodoItem = {
  title: string;
  uuid: string;
};

export type TodoProps = TodoItem & {
  onDelete: () => void;
};

export function Todo(props: TodoProps): React.JSX.Element {
  return (
    <div className="todo">
      <button onClick={props.onDelete} title="Delete Todo">
        <img src={xSquare} alt="Delete" />
      </button>
      <h3>{props.title}</h3>
    </div>
  );
}
