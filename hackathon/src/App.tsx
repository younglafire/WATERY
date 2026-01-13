import { useState } from 'react'
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import './App.css'

const PACKAGE_ID = '0x9b8f252b3c5bd0af86eecf00fff6b0eff8376ceb897ec3d64bb6123805ec4f6d'

function App() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const [greetingText, setGreetingText] = useState('')
  const [newText, setNewText] = useState('')

  // Create a new greeting
  const createGreeting = () => {
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::greeting::new`,
    })

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (result) => {
          console.log('Greeting created successfully!', result)
          alert('Greeting created successfully!')
        },
        onError: (error) => {
          console.error('Error creating greeting:', error)
          alert('Error creating greeting: ' + error.message)
        },
      }
    )
  }

  // Update greeting text
  const updateGreeting = (greetingId: string) => {
    if (!newText) {
      alert('Please enter new text')
      return
    }

    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::greeting::update_text`,
      arguments: [
        tx.object(greetingId),
        tx.pure.string(newText),
      ],
    })

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (result) => {
          console.log('Greeting updated successfully!', result)
          alert('Greeting updated successfully!')
          setNewText('')
        },
        onError: (error) => {
          console.error('Error updating greeting:', error)
          alert('Error updating greeting: ' + error.message)
        },
      }
    )
  }

  return (
    <>
      <div style={{ padding: '20px' }}>
        <h1>Sui Greeting dApp</h1>
        
        {/* Wallet Connection */}
        <div style={{ marginBottom: '20px' }}>
          <ConnectButton />
        </div>

        {account ? (
          <div>
            <p>Connected Address: {account.address}</p>
            
            {/* Create Greeting */}
            <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
              <h2>Create New Greeting</h2>
              <button onClick={createGreeting}>Create Greeting</button>
            </div>

            {/* Update Greeting */}
            <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
              <h2>Update Greeting</h2>
              <input
                type="text"
                placeholder="Greeting Object ID"
                value={greetingText}
                onChange={(e) => setGreetingText(e.target.value)}
                style={{ marginRight: '10px', padding: '5px' }}
              />
              <input
                type="text"
                placeholder="New Text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                style={{ marginRight: '10px', padding: '5px' }}
              />
              <button onClick={() => updateGreeting(greetingText)}>
                Update Greeting
              </button>
            </div>
          </div>
        ) : (
          <p>Please connect your wallet to interact with the dApp</p>
        )}
      </div>
    </>
  )
}

export default App
