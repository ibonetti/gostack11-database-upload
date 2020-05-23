import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const balance = this.transactions.reduce(
      (calcBalance, transaction) => {
        const bal = calcBalance;
        switch (transaction.type) {
          case 'income':
            bal.income += transaction.value;
            break;

          case 'outcome':
            bal.outcome += transaction.value;
            break;

          default:
            break;
        }

        return bal;
      },
      { income: 0, outcome: 0, total: 0 },
    );

    balance.total = balance.income - balance.outcome;

    return balance;
  }
}

export default TransactionsRepository;
