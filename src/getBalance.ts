import { getSPLBalance, printSPLBalance } from './util'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import {connection} from './constants'
const getBalance = async () => {

  const balance = await getSPLBalance(connection, new PublicKey('5FbuZvExdCYzTJDcmAZujdT5HzSUz8daFv9nm3hDFFPF'), new PublicKey('4TME9dRGi7uyier1LeSGhSPCN2ywwjP7n8AEvBZ9KLG1'))
  console.log('balance', balance)

}

getBalance()