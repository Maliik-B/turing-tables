import { useReducer } from 'react'
import { createInitialState, reducer } from './game/engine'
import { BattleScreen } from './components/BattleScreen'

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(),
  )

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <BattleScreen state={state} dispatch={dispatch} />
    </div>
  )
}

export default App
