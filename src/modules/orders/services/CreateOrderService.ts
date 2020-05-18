import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Cliente não existe.');
    }

    const productsDatabase = await this.productsRepository.findAllById(
      products,
    );

    const newProducts = products.map(({ id: product_id, quantity }) => {
      const product = productsDatabase.find(p => p.id === product_id);

      if (!product) {
        throw new AppError('Um ou mais dos produtos enviados não existe.');
      }

      if (quantity > product.quantity) {
        throw new AppError(
          'Um ou mais dos produtos enviados não possui a quantidade necessária.',
        );
      }

      product.quantity -= quantity;

      return {
        product_id,
        price: product.price,
        quantity,
      };
    });

    const orders = await this.ordersRepository.create({
      customer,
      products: newProducts,
    });

    await this.productsRepository.updateQuantity(productsDatabase);

    return orders;
  }
}

export default CreateProductService;
