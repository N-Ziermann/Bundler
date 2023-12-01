import React, { useCallback, useEffect, useState } from 'react';
import { Input } from './components/Input';
import { Todo, TodoItem } from './components/Todo';
import { Button } from './components/Button';
import './App.css';

const LOCAL_STORAGE_TODO_KEY = 'TODOS';
if (!localStorage.getItem(LOCAL_STORAGE_TODO_KEY)) {
  localStorage.setItem(
    LOCAL_STORAGE_TODO_KEY,
    JSON.stringify([
      {
        title: 'Important Todo',
        uuid: crypto.randomUUID(),
      },
    ] satisfies TodoItem[]),
  );
}

export function App(): React.JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [todos, setTodos] = useState<TodoItem[]>(
    JSON.parse(localStorage.getItem(LOCAL_STORAGE_TODO_KEY) ?? '[]'),
  );

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_TODO_KEY, JSON.stringify(todos));
  }, [todos]);

  const createTodo = useCallback(() => {
    const value = inputValue.trim();
    if (!value) {
      return;
    }
    const newTodos = [...todos, { title: value, uuid: crypto.randomUUID() }];
    setTodos(newTodos);
    setInputValue('');
  }, [todos, inputValue]);

  return (
    <main className="app">
      <header className="header">
        <h1 className="title">Yet Another Todo List</h1>
        <div className="inputs">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Todo"
          />
          <Button title="Create" onClick={createTodo} />
        </div>
      </header>
      {todos.map((todo) => (
        <Todo
          key={todo.uuid}
          uuid={todo.uuid}
          title={todo.title}
          onDelete={() =>
            setTodos((prev) => prev.filter((t) => t.uuid !== todo.uuid))
          }
        />
      ))}
    </main>
  );
}
