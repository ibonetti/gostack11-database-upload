import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Transaction type is not valid!', 400);
    }
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();
      if (value > balance.total) {
        throw new AppError('Saldo insuficiente', 400);
      }
    }

    // Check if category exists
    let categoryFound = await categoryRepository.findOne({ title: category });
    if (!categoryFound) {
      categoryFound = await categoryRepository.create({ title: category });
      await categoryRepository.save(categoryFound);
    }

    const newTransaction = await transactionRepository.create({
      title,
      value,
      type,
      category_id: categoryFound?.id,
    });

    await transactionRepository.save(newTransaction);

    return newTransaction;
  }
}

export default CreateTransactionService;
