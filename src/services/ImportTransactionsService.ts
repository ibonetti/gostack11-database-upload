import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, getCustomRepository, In } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CsvTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(file: string): Promise<Transaction[]> {
    const readCSVStream = fs.createReadStream(file);
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);
    const categories: string[] = [];
    const transactions: CsvTransaction[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line.map((item: string) =>
        item.trim(),
      );

      if (!title || !type || !value || !category) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoryRepository = getRepository(Category);
    const categoriesInDatabase = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const categoriesToInsert = categories
      .filter(item => !categoriesInDatabase.find(i => i.title === item))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = await categoryRepository.create(
      categoriesToInsert.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);
    const allCategories = [...categoriesInDatabase, ...newCategories];

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const newTransactions = await transactionsRepository.create(
      transactions.map(impTransaction => ({
        title: impTransaction.title,
        type: impTransaction.type,
        value: impTransaction.value,
        category: allCategories.find(
          item => item.title === impTransaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newTransactions);

    await fs.promises.unlink(file);

    return newTransactions;
  }
}

export default ImportTransactionsService;
