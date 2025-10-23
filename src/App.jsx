import { useState } from 'react'
import './App.css'

// import Animal from './components/Animal'
import BlindDeaf from './components/BlindDeaf'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      {/* <Animal/> */}
      <BlindDeaf/>
    </>
  )
}

export default App