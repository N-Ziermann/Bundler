import React, { useState } from 'react';
import loader from './loader.png';

export function MyComp(props: { name: string }): React.JSX.Element {
  const [state, setState] = useState(0);
  return (
    <>
      <h1 className="test" onClick={() => setState((prev) => prev + 1)}>
        Hello {props.name}; {state}
      </h1>
      <img src={loader} alt="" />
    </>
  );
}
