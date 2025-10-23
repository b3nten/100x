import { useState } from "react";
import "~/clientMain/assets/styles.css";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>Hello World!</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}
